'use strict';

var app = angular.module('OMAFPlayer', ['ngResource']);

// load manifests.json
app.factory('manifests', ['$resource', function($resource) {
  return $resource('manifests.json', {}, {
    query: { method: 'get', isArray: false, cancellable: true}
  });
}]);

app.controller('OMAFController', function ($scope, manifests){

  $scope.player = window.player = new OMAFPlayer();
  $scope.video = document.querySelector('.omaf-player #video1');
  $scope.renderEle = document.querySelector('.omaf-player #renderingSurface');
  $scope.cameraControlElement = document.querySelector('.omaf-player #videobox');

  // get metrics update interval
  $scope.metricsInterval = 1000;
  var metricsIntControl = document.getElementById("inputMetricsUpdate");
  if (metricsIntControl !== null){
    $scope.metricsInterval = metricsIntControl.value;
    metricsIntControl.addEventListener("change", function(){
      $scope.metricsInterval = this.value;
    });
  }

  const progressBar = document.querySelector('.progress-bar');
  const container = document.querySelector('.progress-container');

  $scope.video.addEventListener('timeupdate', updateProgress);

  function updateProgress() {
    var percent = 0;
    if ($scope.player.lastSegNum > 0)
        percent = (($scope.player.segmentNr - 1) / $scope.player.lastSegNum) * 100;
    progressBar.style.width = `${percent}%`;
    // container.querySelector('.progress-handle').style.left = `${percent}%`;
  }

  container.addEventListener('click', function (e) {
    const rect = container.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;
    if ($scope.player && typeof $scope.player.requestSeekToPercent === 'function') {
      $scope.player.requestSeekToPercent(percent);
    }
  });

  // get chart window size
  $scope.chartWindowSize = 100;
  var chartWindowSizeControl = document.getElementById("inputChartWindow");
  if (chartWindowSizeControl !== null){
    $scope.chartWindowSize = chartWindowSizeControl.value;
    chartWindowSizeControl.addEventListener("change", function(){
      $scope.chartWindowSize = this.value;
    });
  }

  // get log level
  $scope.logLevel = window.logLevel = Log.error; 
  var logLevelControl = document.getElementById("logLevelSelect");
  if (logLevelControl !== null){
    logLevelControl.addEventListener("change", function(){
      if(this.value === "error"){
        $scope.logLevel = Log.error;
      } else if(this.value === "warn"){
        $scope.logLevel = Log.warn;
      } else if(this.value === "info"){
        $scope.logLevel = Log.info;
      } else if(this.value === "debug"){
        $scope.logLevel = Log.debug;
      }
      Log.setLogLevel($scope.logLevel);
      window.logLevel = $scope.logLevel;
    });
  }

  Log.setLogLevel($scope.logLevel);
  //window.logLevel = Log.warn;
  //Log.setLogLevel(Log.warn);

  // get render cube wireframe
  var renderDebugControl = document.getElementById("renderDebug");
  if (renderDebugControl !== null){
    $scope.player.setRenderDebugInfo(renderDebugControl.checked);
    renderDebugControl.addEventListener("change", function(){
      $scope.player.setRenderDebugInfo(this.checked);
    });
  }


  // let the use know which version we are using now
  $scope.version = $scope.player.getVersion();
  
  $scope.selectedMPD = { 
    url: 'please select DASH Manifest (MPD) or provide it\'s URL in this field'
  };

  manifests.query(function (data) {
    // 补全本地相对路径的MPD URL
    if (Array.isArray(data.mpds)) {
      data.mpds.forEach(function(mpd) {
        if (mpd.url && !/^https?:\/\//i.test(mpd.url)) {
          mpd.url = window.location.origin + '/' + mpd.url.replace(/^\/+/, '');
        }
      });
    }
    console.log("OMAFController", "Available MPDs:", data.mpds);
    $scope.availableMPDs = data.mpds;
  });

  $scope.setMPD = function (item) { $scope.selectedMPD = JSON.parse(JSON.stringify(item)); };

  $(window).resize(function(){
    $scope.drawChart();
  });

  $scope.player.onInit = function (){
    console.log("OMAFController", "Player initialized");
  }

  // start-up values for metrics
  $scope.yaw = 0;
  $scope.pitch = 0;
  $scope.trackID = 0;
  $scope.segNr = 0;

  $scope.doLoop = function ($event) {
    $scope.player.loop($event.target);
  };

  $scope.doLoad = function () {
    Log.info("OMAFController", "Load MPD");
    Log.warn("OMAFController",$scope.selectedMPD.index)
    var span = document.getElementById("iconPlayPause");
    if (span !== null && $scope.player.initialized) {
      if($scope.player.isPlaying){
        span.classList.remove('fa-pause');
        span.classList.add('fa-play');
        $scope.player.pause();
      }
    }
    $scope.player.reset();

    $scope.player.startNr = 100;
    $scope.player.init($scope.video, $scope.renderEle, $scope.cameraControlElement, $scope.bufferLimit);
    $scope.player.loop($scope.video); // 切换循环播放
    $scope.video.muted = true;
    $scope.player.recoverPlaying = true;
    $scope.player.start($scope.selectedMPD.url);

    $scope.loadTimestamp = Date.now();
    var rowCnt = $scope.chartData.getNumberOfRows();
    $scope.chartData.removeRows(0, rowCnt);
  };

  $scope.doFullscreen = function () {
    Log.info("OMAFController", "change Full screen");
    $scope.player.changeFullScreen();
  };

  $scope.doPlayPause = function () {
    var span = document.getElementById("iconPlayPause");
        if (span !== null && $scope.player.initialized) {
            if($scope.player.isPlaying){
                span.classList.remove('fa-pause');
                span.classList.add('fa-play');
                $scope.player.pause();
            } else{
                span.classList.remove('fa-play');
                span.classList.add('fa-pause');
                $scope.player.play();
            }
        }
  };

  $scope.drawChart = function(){
    if(!$scope.chart || !$scope.chartData) { return; }
    $scope.chart.draw($scope.chartData, { hAxis: { title: 'Time [ms]'}, vAxis: { title: 'Angle'}});
  }

  // 获取URL参数函数
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      name: params.get('name') || '',
      percent: parseInt(params.get('percent')) || 0,
      segment: parseInt(params.get('segment')) || 1
    };
  }

  $scope.AutoStart = async function() {
    console.log('auto start...');
    try {
      const response = await fetch('manifests.json');
      const data = await response.json();
      const params = getUrlParams();

      // 查找匹配的MPD配置
      const mpdUrl = data.mpds.find(mpd => mpd.name === params.name);
      if (!mpdUrl) {
        throw new Error(`找不到名称为 ${params.name} 的视频配置`);
      }

      // 初始化播放器
      $scope.player.reset();
      $scope.player.startNr = params.segment;
      $scope.player.init($scope.video, $scope.renderEle, $scope.cameraControlElement, $scope.bufferLimit);
      $scope.video.muted = true;
      $scope.player.recoverPlaying = true;
      $scope.player.start(mpdUrl.url);
      
      $scope.loadTimestamp = Date.now();

      // $scope.player.requestSeekToPercent(params.segment);
      //$scope.player.seek_play(params.segment);

    } catch (error) {
      console.error('初始化失败:', error);
    }
  }

});

$(document).ready(function () {
  var scope = angular.element(document.querySelector('.omaf-player')).scope();
  if (scope && scope.AutoStart) {
    scope.AutoStart();
  }
});