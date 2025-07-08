// __mocks__/react-dom/test-utils.js

exports.act = async (callback) => {
  if (typeof callback === 'function') {
    const result = callback()
    if (result && typeof result.then === 'function') {
      return result
    }
  }
  return Promise.resolve()
} 