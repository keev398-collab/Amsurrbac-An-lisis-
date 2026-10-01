const { cookieBorrada } = require('./_lib');

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', cookieBorrada());
  res.status(200).json({ ok: true });
};
