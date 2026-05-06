/**
 * 桥接脚本
 * 
 * 网页(injected-helper)消息 
 * => 桥接(message-bridge)转发 
 * => 插件(background/index)接受到网页消息，处理消息并返回处理信息 
 * => 桥接将处理的信息转给 
 * => 网页
 * 
 * 网页脚本：插入到网页上下文， 但是不能访问不到 chrom.runtime
 */

// 监听来自 injected-helper 的消息
window.addEventListener("message", (event) => {
  console.log("收到来自 injected-helper 的消息：", event);
  if (
    event.source !== window ||
    !event.data ||
    event.data.from !== "injected-helper" ||
    !event.data.type ||
    !event.data.requestId
  ) {
    return
  }

  // 转发消息到background
  chrome.runtime.sendMessage(
    {
      type: event.data.type,
      requestId: event.data.requestId,
      data: event.data.data
    },
    (response) => {
      console.log("收到来自 background 的响应：", response)
      if (chrome.runtime.lastError) {
        console.error("转发消息到background失败：", chrome.runtime.lastError)
         window.postMessage({
          from: 'message-bridge',
          requestId: event.data.requestId,
          success: false,
          error: chrome.runtime.lastError.message
         }, window.location.origin)
         return
      }
      
      // 如果是待处理状态，不立即返回，等后续通知
      if (response?.pending) {
        console.log("⏳ 连接请求待处理，等待钱包扩展响应");
        return;
      }
      
      window.postMessage({
        from: 'message-bridge',
        requestId: event.data.requestId,
        success: true,
        data: response?.data
      }, "*")
    }
  )
})

// 监听来自 background 的连接批准消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("收到来自 background 的消息：", message);
  
  if (message.type === 'WALLET_CONNECTION_APPROVED') {
    // 转发连接批准消息到 injected-helper
    window.postMessage({
      from: 'message-bridge',
      requestId: message.requestId,
      success: true,
      data: message.data
    }, "*");
    sendResponse({ success: true });
  }
  
  return true;
})
