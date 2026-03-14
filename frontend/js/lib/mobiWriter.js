
/**
 * MobiWriter.js - ES3 JavaScript port of MobiWriter
 * Minimal writer for the Mobipocket (.mobi) format
 *
 * Usage:
 *   var book = new MobiBook("Title", "Author");
 *   book.setHtmlContent("<html><body>Hello World</body></html>");
 *   var writer = new MobiWriter();
 *   writer.write(book, "output.mobi"); // triggers download in browser
 */

(function(global) {
  "use strict";

  // ============================================================
  // Utils
  // ============================================================

  var Utils = {};

  Utils.swapEndian16 = function(x) {
    return ((x >> 8) & 0xff) | ((x << 8) & 0xff00);
  };

  Utils.swapEndian32 = function(x) {
    return (
      ((x >>> 24) & 0xff) |
      ((x >>> 8) & 0xff00) |
      ((x << 8) & 0xff0000) |
      ((x << 24) & 0xff000000)
    );
  };

  Utils.stringToBytes = function(str, bytes, offset) {
    offset = offset || 0;
    for (var i = 0; i < str.length; i++) {
      bytes[offset + i] = str.charCodeAt(i) & 0xff;
    }
  };

  Utils.ushortToBytes = function(x, bytes, offset, swapEndian) {
    if (swapEndian !== false) {
      x = Utils.swapEndian16(x);
    }
    bytes[offset] = x & 0xff;
    bytes[offset + 1] = (x >> 8) & 0xff;
  };

  Utils.uintToBytes = function(x, bytes, offset, swapEndian) {
    // Handle large numbers that exceed 32-bit signed int
    x = x >>> 0; // Convert to unsigned 32-bit
    if (swapEndian !== false) {
      x = Utils.swapEndian32(x);
    }
    bytes[offset] = x & 0xff;
    bytes[offset + 1] = (x >> 8) & 0xff;
    bytes[offset + 2] = (x >> 16) & 0xff;
    bytes[offset + 3] = (x >>> 24) & 0xff;
  };

  Utils.getFourBytesPadding = function(size) {
    var padding = 4 - (size % 4);
    if (padding === 4) {
      return 0;
    }
    return padding;
  };

  Utils.createByteArray = function(size) {
    var arr = [];
    for (var i = 0; i < size; i++) {
      arr[i] = 0;
    }
    return arr;
  };

  Utils.concatByteArrays = function() {
    var totalLength = 0;
    var i, j;
    for (i = 0; i < arguments.length; i++) {
      totalLength += arguments[i].length;
    }
    var result = [];
    var offset = 0;
    for (i = 0; i < arguments.length; i++) {
      for (j = 0; j < arguments[i].length; j++) {
        result[offset++] = arguments[i][j];
      }
    }
    return result;
  };

  Utils.byteArrayToString = function(bytes) {
    var str = "";
    for (var i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  };

  Utils.stringToByteArray = function(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    return bytes;
  };

  // UTF-8 encode a string to byte array
  Utils.utf8Encode = function(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        bytes.push(c);
      } else if (c < 0x800) {
        bytes.push(0xc0 | (c >> 6));
        bytes.push(0x80 | (c & 0x3f));
      } else if (c < 0xd800 || c >= 0xe000) {
        bytes.push(0xe0 | (c >> 12));
        bytes.push(0x80 | ((c >> 6) & 0x3f));
        bytes.push(0x80 | (c & 0x3f));
      } else {
        // Surrogate pair
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (c >> 18));
        bytes.push(0x80 | ((c >> 12) & 0x3f));
        bytes.push(0x80 | ((c >> 6) & 0x3f));
        bytes.push(0x80 | (c & 0x3f));
      }
    }
    return bytes;
  };

  // ============================================================
  // EofRecord
  // ============================================================

  function EofRecord() {
    this.size_ = 4;
    this.data_ = null;
  }

  EofRecord.prototype.generate = function() {
    this.data_ = [0xe9, 0x8e, 0x0d, 0x0a];
    return true;
  };

  EofRecord.prototype.data = function() {
    return this.data_;
  };

  EofRecord.prototype.size = function() {
    return this.size_;
  };

  // ============================================================
  // ExthHeader
  // ============================================================

  var EXTH_AUTHOR = 100;
  var EXTH_CREATOR_SOFTWARE = 204;
  var EXTH_CREATOR_MAJOR_VERSION = 205;
  var EXTH_CREATOR_MINOR_VERSION = 206;
  var EXTH_CREATOR_BUILD_NUMBER = 207;

  function ExthHeader() {
    this.size_ = 12; // sizeof ExthHeaderStruct (4 + 4 + 4)
    this.data_ = null;
    this.records_ = [];
  }

  ExthHeader.prototype.addRecord = function(type, dataBytes) {
    var recordHeader = Utils.createByteArray(8);
    Utils.uintToBytes(type, recordHeader, 0);
    Utils.uintToBytes(dataBytes.length + 8, recordHeader, 4);

    var recordData = Utils.concatByteArrays(recordHeader, dataBytes);
    this.size_ += recordData.length;
    this.records_.push(recordData);
  };

  ExthHeader.prototype.generate = function() {
    // Add creator software records
    var creatorSoftware = Utils.createByteArray(4);
    Utils.uintToBytes(201, creatorSoftware, 0);
    this.addRecord(EXTH_CREATOR_SOFTWARE, creatorSoftware);

    var creatorMajor = Utils.createByteArray(4);
    Utils.uintToBytes(1, creatorMajor, 0);
    this.addRecord(EXTH_CREATOR_MAJOR_VERSION, creatorMajor);

    var creatorMinor = Utils.createByteArray(4);
    Utils.uintToBytes(2, creatorMinor, 0);
    this.addRecord(EXTH_CREATOR_MINOR_VERSION, creatorMinor);

    var creatorBuild = Utils.createByteArray(4);
    Utils.uintToBytes(33307, creatorBuild, 0);
    this.addRecord(EXTH_CREATOR_BUILD_NUMBER, creatorBuild);

    // Build header
    var header = Utils.createByteArray(12);
    Utils.stringToBytes("EXTH", header, 0);
    Utils.uintToBytes(this.size_, header, 4);
    Utils.uintToBytes(this.records_.length, header, 8);

    this.data_ = header;
    for (var i = 0; i < this.records_.length; i++) {
      this.data_ = Utils.concatByteArrays(this.data_, this.records_[i]);
    }

    // Add padding
    var padding = Utils.getFourBytesPadding(this.data_.length);
    for (var j = 0; j < padding; j++) {
      this.data_.push(0);
    }
    this.size_ += padding;

    return this.data_.length === this.size_;
  };

  ExthHeader.prototype.data = function() {
    return this.data_;
  };

  ExthHeader.prototype.size = function() {
    return this.size_;
  };

  // ============================================================
  // MobiHeader
  // ============================================================

  var MOBI_HEADER_SIZE = 232; // Size of MobiHeaderStruct

  function MobiHeader() {
    this.size_ = MOBI_HEADER_SIZE;
    this.data_ = null;
  }

  MobiHeader.prototype.generate = function(
    textEncoding,
    palmDbHeaderLength,
    palmDocHeaderLength,
    exthHeaderLength,
    bookTitleLength,
    locale,
    textRecordsCount,
  ) {
    var header = Utils.createByteArray(MOBI_HEADER_SIZE);
    var offset = 0;

    // identifier (4 bytes)
    Utils.stringToBytes("MOBI", header, offset);
    offset += 4;

    // header_length (4 bytes)
    Utils.uintToBytes(this.size_, header, offset);
    offset += 4;

    // mobi_file_type (4 bytes) - 2 = Mobipocket book
    Utils.uintToBytes(2, header, offset);
    offset += 4;

    // text_encoding (4 bytes)
    Utils.uintToBytes(textEncoding, header, offset);
    offset += 4;

    // unique_id (4 bytes)
    Utils.uintToBytes(2596053606, header, offset); // Truncated from original
    offset += 4;

    // mobi_file_version (4 bytes)
    Utils.uintToBytes(5, header, offset);
    offset += 4;

    // orthographic_index (4 bytes) - 0xFFFFFFFF = not present
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // inflection_index (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // index_names (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // index_keys (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // extra_index_0 through extra_index_5 (24 bytes)
    for (var i = 0; i < 6; i++) {
      Utils.uintToBytes(0xffffffff, header, offset, false);
      offset += 4;
    }

    // first_non_book_index (4 bytes)
    Utils.uintToBytes(textRecordsCount + 1, header, offset);
    offset += 4;

    // book_title_offset (4 bytes)
    var bookTitleOffset =
      palmDocHeaderLength + MOBI_HEADER_SIZE + exthHeaderLength;
    Utils.uintToBytes(bookTitleOffset, header, offset);
    offset += 4;

    // book_title_length (4 bytes)
    Utils.uintToBytes(bookTitleLength, header, offset);
    offset += 4;

    // locale (4 bytes)
    Utils.uintToBytes(locale, header, offset);
    offset += 4;

    // dictionary_input_language (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // dictionary_output_language (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // minimum_mobipocket_version (4 bytes)
    Utils.uintToBytes(6, header, offset);
    offset += 4;

    // first_image_index (4 bytes)
    Utils.uintToBytes(textRecordsCount + 1, header, offset);
    offset += 4;

    // huffman_record_offset (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // huffman_record_count (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // huffman_table_offset (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // huffman_table_length (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // exth_flags (4 bytes) - 0b1010000 = 80
    Utils.uintToBytes(80, header, offset);
    offset += 4;

    // unknown_bytes_0 (32 bytes) - already zeroed
    offset += 32;

    // drm_offset (4 bytes) - 0xFFFFFFFF = no DRM
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // drm_count (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // drm_size (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // drm_flags (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    // unknown_bytes_1 (12 bytes) - already zeroed
    offset += 12;

    // first_content_record_number (2 bytes)
    Utils.ushortToBytes(1, header, offset);
    offset += 2;

    // last_content_record_number (2 bytes)
    Utils.ushortToBytes(textRecordsCount, header, offset);
    offset += 2;

    // unknown_bytes_2 (4 bytes) - 0x00000001
    Utils.uintToBytes(0x00000001, header, offset, false);
    offset += 4;

    // fcis_record_number (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // fcis_record_count (4 bytes)
    Utils.uintToBytes(0, header, offset, false);
    offset += 4;

    // flis_record_number (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // flis_record_count (4 bytes)
    Utils.uintToBytes(0, header, offset, false);
    offset += 4;

    // unknown_bytes_3 (8 bytes) - already zeroed
    offset += 8;

    // unknown_bytes_4 (4 bytes) - 0xFFFFFFFF
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // unknown_bytes_5 (4 bytes) - already zeroed
    offset += 4;

    // unknown_bytes_6 (4 bytes) - 0xFFFFFFFF
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // unknown_bytes_7 (4 bytes) - 0xFFFFFFFF
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    // unknown_bytes_8 (2 bytes) - already zeroed
    offset += 2;

    // traildata_flags (2 bytes)
    Utils.ushortToBytes(1, header, offset);
    offset += 2;

    // first_indx_record_number (4 bytes)
    Utils.uintToBytes(0xffffffff, header, offset, false);
    offset += 4;

    this.data_ = header;
    return this.data_.length === this.size_;
  };

  MobiHeader.prototype.data = function() {
    return this.data_;
  };

  MobiHeader.prototype.size = function() {
    return this.size_;
  };

  // ============================================================
  // PalmDocHeader
  // ============================================================

  var PALM_DOC_HEADER_SIZE = 16;

  function PalmDocHeader() {
    this.size_ = PALM_DOC_HEADER_SIZE;
    this.data_ = null;
  }

  PalmDocHeader.prototype.generate = function(
    textSize,
    textRecordCount,
  ) {
    var header = Utils.createByteArray(PALM_DOC_HEADER_SIZE);
    var offset = 0;

    // compression (2 bytes) - 1 = no compression
    Utils.ushortToBytes(1, header, offset);
    offset += 2;

    // unused (2 bytes)
    offset += 2;

    // text_length (4 bytes)
    Utils.uintToBytes(textSize, header, offset);
    offset += 4;

    // text_record_count (2 bytes)
    Utils.ushortToBytes(textRecordCount, header, offset);
    offset += 2;

    // text_max_record_size (2 bytes)
    Utils.ushortToBytes(4096, header, offset);
    offset += 2;

    // current_position (4 bytes)
    Utils.uintToBytes(0, header, offset);
    offset += 4;

    this.data_ = header;
    return this.data_.length === this.size_;
  };

  PalmDocHeader.prototype.data = function() {
    return this.data_;
  };

  PalmDocHeader.prototype.size = function() {
    return this.size_;
  };

  // ============================================================
  // PalmDatabaseHeader
  // ============================================================

  var PALM_DB_HEADER_SIZE = 78; // sizeof PalmDatabaseHeaderStruct
  var RECORD_INFO_SIZE = 8; // sizeof RecordInfoStruct

  function PalmDatabaseHeader(recordsCount) {
    this.recordsCount_ = recordsCount;
    this.size_ =
      PALM_DB_HEADER_SIZE + recordsCount * RECORD_INFO_SIZE + 2;
    this.data_ = null;
  }

  PalmDatabaseHeader.prototype.generate = function(
    mobiBookTitle,
    records,
  ) {
    var header = Utils.createByteArray(PALM_DB_HEADER_SIZE);
    var offset = 0;

    // name (32 bytes) - book title, null-padded
    var titleBytes = Utils.utf8Encode(mobiBookTitle);
    for (var i = 0; i < 32 && i < titleBytes.length; i++) {
      header[offset + i] = titleBytes[i];
    }
    offset += 32;

    // attributes (2 bytes)
    offset += 2;

    // version (2 bytes)
    offset += 2;

    // creation_date (4 bytes) - seconds since Jan 1, 1904
    var timestamp = Math.floor(Date.now() / 1000) + 2082844800; // Unix to Palm epoch
    Utils.uintToBytes(timestamp, header, offset);
    offset += 4;

    // modification_date (4 bytes)
    Utils.uintToBytes(timestamp, header, offset);
    offset += 4;

    // last_backup_date (4 bytes)
    offset += 4;

    // modification_number (4 bytes)
    offset += 4;

    // app_info_id (4 bytes)
    offset += 4;

    // sort_info_id (4 bytes)
    offset += 4;

    // type (4 bytes) - "BOOK"
    Utils.stringToBytes("BOOK", header, offset);
    offset += 4;

    // creator (4 bytes) - "MOBI"
    Utils.stringToBytes("MOBI", header, offset);
    offset += 4;

    // unique_id_seed (4 bytes)
    offset += 4;

    // next_record_list_id (4 bytes)
    offset += 4;

    // number_of_records (2 bytes)
    Utils.ushortToBytes(records.length, header, offset);
    offset += 2;

    this.data_ = header;

    // Record info entries
    var recordDataOffset =
      PALM_DB_HEADER_SIZE + records.length * RECORD_INFO_SIZE + 2;

    for (var r = 0; r < records.length; r++) {
      var recordInfo = Utils.createByteArray(RECORD_INFO_SIZE);
      Utils.uintToBytes(recordDataOffset, recordInfo, 0);
      // attributes (1 byte) and unique_id (3 bytes) are zeroed
      this.data_ = Utils.concatByteArrays(this.data_, recordInfo);
      recordDataOffset += records[r].length;
    }

    // 2-byte gap
    this.data_.push(0);
    this.data_.push(0);

    return this.data_.length === this.size_;
  };

  PalmDatabaseHeader.prototype.data = function() {
    return this.data_;
  };

  PalmDatabaseHeader.prototype.size = function() {
    return this.size_;
  };

  // ============================================================
  // MobiBook
  // ============================================================

  function MobiBook(title, author) {
    this.title_ = title;
    this.author_ = author;
    this.htmlContent_ = "";
  }

  MobiBook.prototype.title = function() {
    return this.title_;
  };

  MobiBook.prototype.author = function() {
    return this.author_;
  };

  MobiBook.prototype.htmlContent = function() {
    return this.htmlContent_;
  };

  MobiBook.prototype.setHtmlContent = function(html) {
    this.htmlContent_ = html;
  };

  // For loading from file input in browser
  MobiBook.prototype.loadHtmlFromFileInput = function(
    fileInput,
    callback,
  ) {
    var self = this;
    if (typeof FileReader === "undefined") {
      callback(false, "FileReader not supported");
      return;
    }
    var file = fileInput.files[0];
    if (!file) {
      callback(false, "No file selected");
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      self.htmlContent_ = e.target.result;
      callback(true);
    };
    reader.onerror = function() {
      callback(false, "Error reading file");
    };
    reader.readAsText(file);
  };

  // ============================================================
  // MobiWriter
  // ============================================================

  function MobiWriter() {
    this.textRecords_ = [];
  }

  MobiWriter.prototype.write = function(mobiBook, filename, skipDownload) {
    this.textRecords_ = [];

    // Convert HTML content to UTF-8 bytes and chunk into 4096-byte records
    var htmlBytes = Utils.utf8Encode(mobiBook.htmlContent());
    for (var i = 0; i < htmlBytes.length; i += 4096) {
      var chunk = [];
      for (var j = i; j < i + 4096 && j < htmlBytes.length; j++) {
        chunk.push(htmlBytes[j]);
      }
      chunk.push(0); // null terminator
      this.textRecords_.push(chunk);
    }

    if (this.textRecords_.length === 0) {
      this.textRecords_.push([0]); // At least one record
    }

    var palmDatabaseHeader = new PalmDatabaseHeader(
      this.textRecords_.length + 2,
    );
    var palmDocHeader = new PalmDocHeader();
    var mobiHeader = new MobiHeader();
    var exthHeader = new ExthHeader();
    var eofRecord = new EofRecord();

    // Add author to EXTH header
    var authorBytes = Utils.utf8Encode(mobiBook.author());
    exthHeader.addRecord(EXTH_AUTHOR, authorBytes);

    if (!exthHeader.generate()) {
      return { success: false, error: "Error creating EXTH header" };
    }

    if (
      !palmDocHeader.generate(htmlBytes.length, this.textRecords_.length)
    ) {
      return { success: false, error: "Error creating PalmDoc header" };
    }

    var titleBytes = Utils.utf8Encode(mobiBook.title());
    if (
      !mobiHeader.generate(
        65001, // UTF-8 encoding
        palmDatabaseHeader.size(),
        palmDocHeader.size(),
        exthHeader.size(),
        titleBytes.length,
        1033, // Locale (English US)
        this.textRecords_.length,
      )
    ) {
      return { success: false, error: "Error creating MOBI header" };
    }

    // Build record0: PalmDocHeader + MobiHeader + ExthHeader + padded title
    var record0 = Utils.concatByteArrays(
      palmDocHeader.data(),
      mobiHeader.data(),
      exthHeader.data(),
    );

    // Add padded book title
    var titlePadding = Utils.getFourBytesPadding(titleBytes.length + 2);
    for (var t = 0; t < titleBytes.length; t++) {
      record0.push(titleBytes[t]);
    }
    for (var p = 0; p < titlePadding + 2; p++) {
      record0.push(0);
    }

    // Collect all records
    var records = [record0];
    for (var r = 0; r < this.textRecords_.length; r++) {
      records.push(this.textRecords_[r]);
    }

    if (!eofRecord.generate()) {
      return { success: false, error: "Error generating EOF record" };
    }
    records.push(eofRecord.data());

    if (!palmDatabaseHeader.generate(mobiBook.title(), records)) {
      return {
        success: false,
        error: "Error generating Palm database header",
      };
    }

    // Concatenate all data
    var allData = palmDatabaseHeader.data();
    for (var rec = 0; rec < records.length; rec++) {
      allData = Utils.concatByteArrays(allData, records[rec]);
    }

    // Trigger download in browser
    if (!skipDownload) {
      this._downloadFile(allData, filename);
    }

    return { success: true, data: allData };
  };

  MobiWriter.prototype._downloadFile = function(byteArray, filename) {
    // Convert byte array to binary string
    var binaryString = "";
    for (var i = 0; i < byteArray.length; i++) {
      binaryString += String.fromCharCode(byteArray[i]);
    }

    // Try modern Blob API first, fall back to data URI
    if (
      typeof Blob !== "undefined" &&
      typeof URL !== "undefined" &&
      URL.createObjectURL
    ) {
      // Modern browsers
      var uint8 = [];
      for (var j = 0; j < byteArray.length; j++) {
        uint8.push(byteArray[j]);
      }

      // Create Uint8Array if available, otherwise use array
      var blobData;
      if (typeof Uint8Array !== "undefined") {
        blobData = new Uint8Array(uint8);
      } else {
        blobData = binaryString;
      }

      var blob = new Blob([blobData], {
        type: "application/x-mobipocket-ebook",
      });
      var url = URL.createObjectURL(blob);

      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers using data URI
      var base64 = this._btoa(binaryString);
      var dataUri =
        "data:application/x-mobipocket-ebook;base64," + base64;

      // Open in new window (user will need to save manually)
      var win = window.open(dataUri, "_blank");
      if (!win) {
        return {
          success: false,
          error:
            "Popup blocked. Please allow popups to download the file.",
        };
      }
    }
  };

  // Base64 encoding for older browsers
  MobiWriter.prototype._btoa = function(str) {
    if (typeof btoa !== "undefined") {
      return btoa(str);
    }

    // Manual base64 encoding for very old browsers
    var chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var result = "";
    var i = 0;

    while (i < str.length) {
      var a = str.charCodeAt(i++) || 0;
      var b = str.charCodeAt(i++) || 0;
      var c = str.charCodeAt(i++) || 0;

      var triplet = (a << 16) | (b << 8) | c;

      result += chars.charAt((triplet >> 18) & 0x3f);
      result += chars.charAt((triplet >> 12) & 0x3f);
      result +=
        i > str.length + 1 ? "=" : chars.charAt((triplet >> 6) & 0x3f);
      result += i > str.length ? "=" : chars.charAt(triplet & 0x3f);
    }

    return result;
  };

  // Get raw bytes without triggering download
  MobiWriter.prototype.getBytes = function(mobiBook) {
    var result = this.write(mobiBook, "");
    return result.data;
  };

  // ============================================================
  // Export to global scope
  // ============================================================

  global.MobiWriter = MobiWriter;
  global.MobiBook = MobiBook;
  global.MobiWriterUtils = Utils;
})(typeof window !== "undefined" ? window : this);
