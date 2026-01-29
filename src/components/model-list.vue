<template>
  <div style="background-color: #fff;">
    <h3>
      高斯模型列表
    </h3>
    <a v-for="(model, index) in models" :key="index" :href="pageUrl[index]" target="_blank" rel="noopener noreferrer"
      style="display: block;">{{ model }}</a>
  </div>
</template>

<script>
export default {
  name: 'ModelList',
  data() {
    return {
      models: [],
      pageUrl: []
    };
  },
  created() {
    this.fetchModels();
  },
  methods: {
    async fetchModels() {
      try {
        // 核心1：从环境变量获取base前缀，拼接json请求路径（确保能正确请求到文件）
        const baseUrl = import.meta.env.VITE_BASE_URL;
        // 拼接json文件的完整请求路径，适配base前缀
        const jsonRequestUrl = `${baseUrl}gaussianSplat/model-url.json`;
        const response = await fetch(jsonRequestUrl);

        // 判空：确保请求成功（状态码200）
        if (!response.ok) throw new Error(`请求失败：${response.status}`);

        const urlData = await response.json();
        if (urlData.base === '__AUTO_BASE__') {
          // 核心2：拼接base前缀，生成正确的基础路径（域名 + /pkumedia/）
          urlData.base = window.location.origin + baseUrl;
        }
        const allSplat = Object.values(urlData.models);
        for (let i = 1; i < (allSplat.length + 1); i++) {
          this.models.push(`${urlData.base}${allSplat[i - 1]}`);
          this.pageUrl.push(`${urlData.base}model?id=${i}`);
        }
        console.log('Models fetched:', this.models);
      } catch (error) {
        console.error('Error fetching models:', error);
      }
    }
  },
}
</script>