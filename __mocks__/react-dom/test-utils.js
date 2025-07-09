// __mocks__/react-dom/test-utils.js

exports.act = async (callback) => {
  if (typeof callback === 'function') {
    const result = callback()
    if (result && typeof result.then === 'function') {
      await result          // ensure async work is complete
    }
    // TODO: flush pending React updates here to fully mirror React 18’s behavior
  }
  return Promise.resolve();
}