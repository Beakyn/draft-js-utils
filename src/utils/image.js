const dimensionsToString = data => {
  const { width: rawWidth, height: rawHeight } = data;
  const width = rawWidth.replace('px', '');
  const height = rawHeight.replace('px', '');
  return `${width}x${height}`;
};

module.exports = {
  dimensionsToString
};
