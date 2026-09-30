/**
 * Ted & Sherryle — RSVP endpoint
 * ---------------------------------------------------------------------------
 * Google Apps Script bound to the RSVP spreadsheet. Receives posts from the
 * form in index.html and appends (or updates) a row in the `RSVPs` tab.
 *
 * DEPLOY
 *   1. Open the Google Sheet → Extensions → Apps Script → paste this file.
 *   2. Run `setup()` once (Run ▸ setup) and grant the permissions it asks for.
 *      That creates the `RSVPs` tab, the header row, and the formatting.
 *   3. Deploy ▸ New deployment ▸ Web app.
 *        Execute as:      Me
 *        Who has access:  Anyone      ← must be "Anyone", or guests hit a
 *                                       Google sign-in wall.
 *   4. Copy the /exec URL into RSVP_ENDPOINT in index.html.
 *   5. Send one test reply and confirm the row lands.
 *
 * After editing this file you must Deploy ▸ Manage deployments ▸ ✏️ ▸
 * Version: New version. Saving alone does not update the live /exec URL.
 *
 * REQUEST SHAPE
 *   The page posts URLSearchParams (application/x-www-form-urlencoded), which
 *   keeps it a CORS "simple" request — Apps Script cannot answer a preflight,
 *   so do not switch the client to JSON. Values arrive on `e.parameter`:
 *     name, attending, guests, message, submitted
 */

/* ── Config ───────────────────────────────────────────────────────────── */

var CONFIG = {
  SHEET_NAME: 'RSVPs',

  /** A guest who replies twice overwrites their earlier row instead of
   *  creating a second one. Matching is on a normalised name. Set to false to
   *  keep every submission as its own row. */
  UPDATE_EXISTING: true,

  /** Hard caps, mirroring the form. */
  MAX_NAME: 120,
  MAX_MESSAGE: 400,
  MAX_SEATS: 2,

  /** Reject anything past this date (ISO, sheet's timezone). '' = no cutoff. */
  CLOSES_ON: '',

  /** Token required by the ?action=list / ?action=stats debug reads on doGet.
   *  Change it to any random string; leave '' to disable those reads. */
  READ_TOKEN: ''
};

var HEADERS = [
  'Timestamp',
  'Name',
  'Attending',
  'Seats',
  'Message',
  'Submitted (browser)',
  'Revisions'
];

/* ── Web app entry points ─────────────────────────────────────────────── */

/**
 * Handles the form post. Always returns JSON; the client only checks that the
 * response was 2xx, but the body makes failures readable in the console.
 */
function doPost(e) {
  try {
    var params = (e && e.parameter) || {};

    if (isClosed_()) {
      return json_({ ok: false, error: 'closed', message: 'RSVPs are closed.' });
    }

    var reply = parseReply_(params);
    if (reply.error) {
      return json_({ ok: false, error: 'invalid', message: reply.error });
    }

    var result = save_(reply);

    return json_({ ok: true, updated: result.updated, row: result.row });
  } catch (err) {
    // Log to Executions so a failed reply can be recovered by hand.
    console.error('doPost failed: ' + (err && err.stack || err), e && e.parameter);
    return json_({ ok: false, error: 'server', message: String(err && err.message || err) });
  }
}

/**
 * Health check, and — with READ_TOKEN set — a quick read of the register:
 *   /exec                              → { ok: true, ... }
 *   /exec?action=stats&token=…         → counts
 *   /exec?action=list&token=…          → every row
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'ping';

  if (action === 'ping') {
    return json_({ ok: true, service: 'rsvp', sheet: CONFIG.SHEET_NAME, closed: isClosed_() });
  }

  if (!CONFIG.READ_TOKEN || params.token !== CONFIG.READ_TOKEN) {
    return json_({ ok: false, error: 'unauthorised' });
  }

  var rows = readAll_();

  if (action === 'stats') return json_({ ok: true, stats: summarise_(rows) });
  if (action === 'list')  return json_({ ok: true, count: rows.length, rows: rows });

  return json_({ ok: false, error: 'unknown action: ' + action });
}

/* ── Core ─────────────────────────────────────────────────────────────── */

/** Validates and normalises the posted parameters. */
function parseReply_(p) {
  var name = String(p.name || '').trim().replace(/\s+/g, ' ').slice(0, CONFIG.MAX_NAME);
  if (!name) return { error: 'Please tell us your name.' };

  var attending = String(p.attending || '').trim();
  var accepts = /^joyfully/i.test(attending);
  var declines = /^regretfully/i.test(attending);
  if (!accepts && !declines) return { error: 'Please choose whether you can attend.' };
  attending = accepts ? 'Joyfully accepts' : 'Regretfully declines';

  // Seats only mean anything for an acceptance; the form sends 0 on a decline.
  var seats = parseInt(p.guests, 10);
  if (isNaN(seats) || seats < 0) seats = accepts ? 1 : 0;
  seats = accepts ? Math.min(Math.max(seats, 1), CONFIG.MAX_SEATS) : 0;

  var message = String(p.message || '').trim().slice(0, CONFIG.MAX_MESSAGE);

  return {
    name: name,
    attending: attending,
    accepts: accepts,
    seats: seats,
    message: message,
    submitted: String(p.submitted || '')
  };
}

/**
 * Writes the reply. Serialised behind a script lock so two guests submitting
 * at the same moment cannot land on the same row.
 */
function save_(reply) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_();
    var now = new Date();
    var rowIndex = CONFIG.UPDATE_EXISTING ? findRowByName_(sheet, reply.name) : -1;

    if (rowIndex > 0) {
      var revisions = Number(sheet.getRange(rowIndex, 7).getValue()) || 0;
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([[
        now, reply.name, reply.attending, reply.seats, reply.message,
        reply.submitted, revisions + 1
      ]]);
      return { updated: true, row: rowIndex };
    }

    sheet.appendRow([
      now, reply.name, reply.attending, reply.seats, reply.message,
      reply.submitted, 0
    ]);
    return { updated: false, row: sheet.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

/** Last row whose name matches, ignoring case, spacing and punctuation. */
function findRowByName_(sheet, name) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;

  var names = sheet.getRange(2, 2, last - 1, 1).getValues();
  var key = normalise_(name);
  for (var i = names.length - 1; i >= 0; i--) {
    if (normalise_(names[i][0]) === key) return i + 2;
  }
  return -1;
}

function normalise_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** The RSVPs tab, created with its header row if it isn't there yet. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    writeHeader_(sheet);
  } else if (sheet.getLastRow() === 0) {
    writeHeader_(sheet);
  }
  return sheet;
}

function writeHeader_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#f2efe9');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160); // Timestamp
  sheet.setColumnWidth(2, 220); // Name
  sheet.setColumnWidth(3, 150); // Attending
  sheet.setColumnWidth(4, 70);  // Seats
  sheet.setColumnWidth(5, 420); // Message
  sheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

function isClosed_() {
  if (!CONFIG.CLOSES_ON) return false;
  var cutoff = new Date(CONFIG.CLOSES_ON + 'T23:59:59');
  return !isNaN(cutoff.getTime()) && new Date() > cutoff;
}

/* ── Reading ──────────────────────────────────────────────────────────── */

function readAll_() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];

  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues().map(function (r) {
    return {
      timestamp: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, "yyyy-MM-dd HH:mm:ss") : String(r[0]),
      name: r[1],
      attending: r[2],
      seats: Number(r[3]) || 0,
      message: r[4],
      revisions: Number(r[6]) || 0
    };
  });
}

function summarise_(rows) {
  var accepted = rows.filter(function (r) { return /^joyfully/i.test(r.attending); });
  var declined = rows.filter(function (r) { return /^regretfully/i.test(r.attending); });
  var seats = accepted.reduce(function (sum, r) { return sum + r.seats; }, 0);
  return {
    replies: rows.length,
    accepted: accepted.length,
    declined: declined.length,
    seatsReserved: seats
  };
}

/* ── Run these by hand from the editor ────────────────────────────────── */

/** Run once after pasting this file: creates the tab, header and formatting. */
function setup() {
  var sheet = getSheet_();
  console.log('Ready: "%s" tab in %s',
    CONFIG.SHEET_NAME, SpreadsheetApp.getActiveSpreadsheet().getUrl());
  return sheet.getName();
}

/** Prints the current tally to the execution log. */
function stats() {
  var s = summarise_(readAll_());
  console.log('%s replies — %s accepted (%s seats), %s declined',
    s.replies, s.accepted, s.seatsReserved, s.declined);
  return s;
}

/** Fakes a submission so you can verify the write path without the website. */
function testWrite() {
  var res = doPost({ parameter: {
    name: 'Test Guest',
    attending: 'Joyfully accepts',
    guests: '2',
    message: 'Delete this row.',
    submitted: new Date().toISOString()
  }});
  console.log(res.getContent());
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
