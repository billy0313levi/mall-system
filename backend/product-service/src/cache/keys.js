const { createHash } = require('crypto');

function productDetailKey(productId) {
  return `product:detail:${productId}`;
}

function productListKey(params) {
  const hash = createHash('md5').update(JSON.stringify(params)).digest('hex');
  return `product:list:${hash}`;
}

function randomTtl(baseSeconds) {
  return baseSeconds + Math.floor(Math.random() * 120);
}

module.exports = {
  productDetailKey,
  productListKey,
  randomTtl
};
