const busboy = require('busboy');

exports.busboyPromise = (req) => {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const formData = { fields: {}, files: [] };
    const MAX_SIZE = 256 * 1024; // 256KB

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];
      let fileSize = 0;

      file.on('data', (data) => {
        fileSize += data.length;
        if (fileSize > MAX_SIZE) {
          file.unpipe();
          file.resume();
          reject(new Error(`File ${filename} exceeds the maximum allowed size of 256KB.`));
          return;
        }
        chunks.push(data);
      });

      file.on('end', () => {
        formData.files.push({
          name,
          filename,
          encoding,
          mimeType,
          content: Buffer.concat(chunks)
        });
      });
    });

    bb.on('field', (name, value, info) => {
      formData.fields[name] = value;
    });

    bb.on('finish', () => {
      resolve(formData);
    });

    bb.on('error', (err) => {
      reject(err);
    });

    req.pipe(bb);
  });
};
