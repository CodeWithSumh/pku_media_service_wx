# -*- coding: utf-8 -*-
# coding=utf-8
#!/usr/bin/env python
from flask import Flask,render_template,jsonify,request,make_response,Response
from urlparse import urlparse
from threading import Thread

import datetime, time
import os
import uuid
import json

app = Flask(__name__, static_folder="lib/amis", template_folder="lib/amis_templates")

@app.route('/')
def index_page():
    return render_template('index.html')

@app.route('/upload',methods=['POST'])
def upload():
    file = request.files['file']
    now_time = datetime.datetime.now()
    today_str = datetime.datetime.strftime(now_time,'%Y%m%d')
    url = file.filename
    if os.path.exists(os.path.join(app.root_path,"upload",today_str))==False:
        os.makedirs(os.path.join(app.root_path,"upload",today_str))
    
    try:
        with open(os.path.join(app.root_path,"upload",today_str,file.filename),'wb') as f:
            f.write(file.stream.read())
            url = request.url_root + "download/" + today_str + "/" + file.filename
    except IOError:
        return make_response('erro',500)
    
    return jsonify({
        "status": 0,
        "msg": "",
        "data": {
            "value": url
        }
    })

@app.route('/startchunk',methods=['POST'])
def startchunk():
    data = json.loads(request.get_data(as_text=True))
    fileName = data['filename']
    now_time = datetime.datetime.now()
    today_str = datetime.datetime.strftime(now_time,'%Y%m%d')
   
    if os.path.exists(os.path.join(app.root_path,"upload",today_str))==False:
        os.makedirs(os.path.join(app.root_path,"upload",today_str))

    return jsonify({
        "status": 0,
        "msg": "",
        "data": {
            "key": today_str+"/"+fileName,
            "uploadId": str(uuid.uuid1()).replace('-','')
        }
    })

@app.route('/chunk',methods=['POST'])
def chunk():
    key = request.form.get('key')
    file = request.files['file']

    eTag = str(uuid.uuid1()).replace('-','')
    save_path = os.path.join(app.root_path,"upload",key.split('/')[0])
    file_path = os.path.join(save_path,eTag)
    
    try:
        with open(file_path,'ab') as f:
            f.seek(0)
            f.write(file.stream.read())
    except OSError:
        return make_response('errors',500)

    return jsonify({
        "status": 0,
        "msg": "",
        "data": {
            "eTag": eTag
        }
    })
    
@app.route('/finishchunk',methods=['POST'])
def finishchunk():
    data = json.loads(request.get_data(as_text=True))
    filename = data['filename']
    key = data['key']
    partList = data['partList']

    filePath = os.path.join(app.root_path,"upload",key.split('/')[0],filename)

    try:
        with open(filePath,'wb') as f:
            for part in partList:
                #partNumber = part['partNumber']
                eTag = part['eTag']
                eTagFile = open(os.path.join(app.root_path,"upload",key.split('/')[0],eTag),'rb')
                f.write(eTagFile.read())
                eTagFile.close()
                os.remove(os.path.join(app.root_path,"upload",key.split('/')[0],eTag))
    except IOError:
        return make_response('errors',500) 

    return jsonify({
        "status": 0,
        "msg": "",
        "data": {
            "value": request.url_root + "download/" + key
        }
    })

@app.route('/delete',methods=['POST'])
def delete_file():
    fileName = request.args.get('file')
    now_time = datetime.datetime.now()
    today_str = datetime.datetime.strftime(now_time,'%Y%m%d')
    filePath = os.path.join(app.root_path,"upload",today_str,fileName)
    if os.path.isfile(filePath):
        os.remove(filePath)
        return jsonify({"status":0,"msg":"The file has been deleted successfully. "})
    return jsonify({"status":422,"errors":" Failure!"})

@app.route('/download/<createdDate>/<fileName>')
def download(createdDate,fileName):
    filePath = os.path.join(app.root_path,"upload",createdDate,fileName)
    try:
        with open(filePath,'rb') as f:
            stream = f.read()
        response = Response(stream,content_type='application/octet-stream')
        response.headers['Content-dispostion']='attachment;filename=%s' %fileName
        return response 
    except IOError:
        make_response('errors',500) 


# tid -> [status]
g_task_status = {}
# tid -> [progress, remain_time]
g_task_detail = {}

def async_task(task):
    tid = task["id"]
    input_path = task["input"]
    output_path = task["output"]
    
    global g_task_status
    global g_task_detail
    g_task_status[tid] = 'RUNNING'
    g_task_detail[tid] = [0, 0]    
    print("parse: %s => %s\n" % (input_path, output_path))
    huge_py = os.path.abspath(os.path.join(__file__, "../omaf-file-creation/createTestVectors/create_huge_omaf_files.py"))
    huge_fmt = "python2 %s tid_%s %s %s 0 -1 -1"
    print("calling:", huge_fmt % (huge_py, tid, input_path, output_path), "\n")    
    # TODO: 调用huge脚本
    #os.system(huge_fmt % (huge_py, tid, input_path, output_path))
    
    relative_live_path = os.path.relpath(os.path.join(output_path, "huge_live.mpd"), app.root_path)
    manifests_path = os.path.join(app.root_path, "manifests.json")
    try:
        with open(manifests_path, 'r') as f:
            data = json.load(f)
    except (IOError, ValueError):
        data = {"mpds": []}

    # 结果列表 倒序
    data["mpds"].insert(
        0, 
        {
        "name": os.path.splitext(os.path.basename(input_path))[0],
        "url": "/" + relative_live_path.replace("\\", "/")
    })
    with open(manifests_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    time.sleep(5)
    print("finish!")
    g_task_status[tid] = 'DONE'

@app.route('/query_work', methods=['POST', 'GET'])
def query_work():
    tid = request.args.get('tid')
    status = g_task_status[tid] if tid in g_task_status else "NONE"
    progress, remain_time = [0, 0]
    if tid in g_task_detail:
        progress, remain_time = g_task_detail[tid]
    return jsonify({"status" : 0,
                    "msg": {
                        "status" : status,
                        "progress" : progress,
                        "remain_time" : remain_time
                        }
                    })

@app.route('/update_work', methods=['POST'])
def update_work():
    data = json.loads(request.get_data(as_text=True))
    tid = data.get('tid')
    progress = data.get('progress')
    remain_time = data.get('remain_time')
    global g_task_status
    global g_task_detail
    g_task_status[tid] = 'RUNNING'
    g_task_detail[tid] = [progress, remain_time]
    return jsonify({"status": 0})

@app.route('/commit', methods=['POST'])
def commit():
    data = json.loads(request.get_data(as_text=True))
    tid = str(uuid.uuid1()).replace('-','')
    
    file = data.get('file').split(",")[0]
    relative_path = urlparse(file).path[1:]
    relative_path = relative_path.replace(os.path.altsep, os.path.sep)
    msg = {}
    msg["path"] = relative_path
    msg["tid"] = tid
    
    # 异步线程启动任务
    task= {}
    task["id"] = tid    
    task["input"] = os.path.join(app.root_path, relative_path)
    task["output"] = task["input"].replace(
            os.path.join(app.root_path, "download"),
            os.path.join(app.root_path, "hevc"))
    task["output"] = os.path.splitext(task["output"])[0]
    if not os.path.exists(task["output"]):
        os.makedirs(task["output"])
    
    global g_task_status
    g_task_status[tid] = 'NONE'
    
    Thread(target=async_task, args=(task,)).start()
    
    return jsonify({"status":0,
                    "msg": msg
                    })


if __name__ == "__main__":
    app.run(host="0.0.0.0")
