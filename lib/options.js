// Sizes or models of one product, for example "1,000 L/h with UV".
// They are kept on the product in products.options (a JSON list), each like:
//   { id: 'uv-1000', label: '1,000 L/h with UV', price: 45000, features: 'one spec per line', image: '/products/…' }
// Used on both the server and in the browser.

export function productOptions(product) {
  return Array.isArray(product?.options)
    ? product.options.filter((o) => o && typeof o.id === 'string' && o.id && o.label)
    : []
}

export function findOption(product, optionId) {
  if (!optionId) return null
  return productOptions(product).find((o) => o.id === optionId) || null
}

// The lowest real price, for "From KSh …" labels and sorting
export function lowestPrice(product) {
  const prices = productOptions(product)
    .map((o) => Number(o.price))
    .filter((p) => p > 0)
  return prices.length ? Math.min(...prices) : Number(product?.price) || 0
}

// One cart line per product and size
export function cartKey(productId, optionId) {
  return optionId ? productId + '|' + optionId : productId
}

export function nameWithOption(productName, option) {
  return option ? `${productName} (${option.label})` : productName
}
