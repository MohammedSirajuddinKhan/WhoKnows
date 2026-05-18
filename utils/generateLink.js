module.exports = function generateLink(username, baseUrl = "") {
  return `${baseUrl}/u/${username}`;
};
