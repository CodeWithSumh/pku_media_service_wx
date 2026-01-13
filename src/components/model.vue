<template>
  <div style="width: 100vw; height: 100vh">
    <!-- v-show="fileUrl && !showSplatEditor && !gsLoading"  -->
    <!-- <iframe ref="3dIframe" v-show="fileUrl && !showSplatEditor" style="width: 100%; border-radius: 16px; border: none; height: 100%"
      src="gaussianSplat/garden.html" @load="sendMessage"/>
       -->
    <iframe ref="3dIframe" style="width: 100%; border-radius: 16px; border: none; height: 100%"
      src="gaussianSplat/index.html"/>
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
  created() {
    this.getModelUrl();
  },
  methods: {
    // web、小程序获取模型各种信息
    getModelUrl() {
        setTimeout(() => {
          this.iframeEle = this.$refs['3dIframe'];
          this.sendMessage();
          // this.iframeEle.contentWindow.postMessage({ url: this.fileUrl, cameraUrl: this.cameraUrl, initCameraUrl: '', envImageUrl: this.envImageUrl }, "*");
        }, 1000);
    },
    sendMessage() {
      this.iframeEle.contentWindow.postMessage({ pageParams: this.$route.query }, "*");
    },
  }
}

</script>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>