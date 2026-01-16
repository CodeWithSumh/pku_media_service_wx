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
        const response = await fetch('/gaussianSplat/model-url.json');
        const urlData = await response.json();
        if (urlData.base === '__AUTO_BASE__') {
          urlData.base = window.location.origin + '/';
        }
        const allSplat = Object.values(urlData.models);
        for (let i = 1; i < (allSplat.length + 1); i++) {
          this.models.push(`${urlData.modelsBase}${allSplat[i - 1]}`);
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