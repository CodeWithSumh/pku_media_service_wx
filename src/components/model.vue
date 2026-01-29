<template>
  <div style="width: 100vw; height: 100vh">
    <!-- v-show="fileUrl && !showSplatEditor && !gsLoading"  -->
    <!-- <iframe ref="3dIframe" v-show="fileUrl && !showSplatEditor" style="width: 100%; border-radius: 16px; border: none; height: 100%"
      src="gaussianSplat/garden.html" @load="sendMessage"/>
       -->
    <iframe ref="3dIframe" style="width: 100%; border-radius: 16px; border: none; height: 100%"
      src="gaussianSplat/index.html" />
  </div>
</template>

<script>

export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      count: 0,
      iframeEle: null,
      // web、小程序获取模型各种信息
      showSplatEditor: false,

    };
  },
  mounted() {
    this.getModelUrl();
  },
  methods: {
    // web、小程序获取模型各种信息
    getModelUrl() {
      // 等待iframe加载完成后发送消息
      const iframe = this.$refs['3dIframe'];
      console.log('iframe element from ref:', iframe);

      if (!iframe) {
        console.error('iframe element not found, retrying...');
        setTimeout(() => this.getModelUrl(), 100);
        return;
      }

      if (iframe.attachEvent) {
        iframe.attachEvent('onload', () => {
          console.log('iframe loaded (IE)');
          this.iframeEle = iframe;
          this.sendMessage();
        });
      } else {
        iframe.onload = () => {
          console.log('iframe loaded');
          this.iframeEle = iframe;
          this.sendMessage();
        };
      }
    },
    sendMessage() {
      this.$route.query.baseUrl = window.BASE_URL || '/'
      console.log('iframe element:', this.iframeEle);
      if (!this.iframeEle || !this.iframeEle.contentWindow) {
        console.error('iframe or contentWindow not available');
        return;
      }
      this.iframeEle.contentWindow.postMessage({ pageParams: this.$route.query }, "*");
      console.log('Message sent successfully');
    },
  }
}

</script>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>