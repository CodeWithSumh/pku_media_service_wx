# -*- coding: utf-8 -*-
# coding=utf-8
#!/usr/bin/env python

"""
解决大文件处理磁盘占用问题

通过将mp4全景视频 按小片段 循环处理
1. 调用ffmpeg 将输入视频的逻辑分段 转换成 yuv文件
2. 调用create_omaf_files.py 将yuv文件 生成 omaf文件
3. 清理步骤1和步骤2生成的临时文件
4. 追加合并 步骤2生成到mpd文件信息 到最终的mpd大文件

"""
import os, sys, math
import time
import subprocess
import shutil
import uuid
import json
import urllib2
import numpy as np
import xml.etree.ElementTree as ET

INPUT_FPS = 30
OUTPUT_FPS = int(INPUT_FPS + 14.99) // 30 * 30

def video_get_duration(input_file):
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json',
        input_file
    ]
    process = subprocess.Popen(
        cmd,
        stdout = subprocess.PIPE,
        stderr = subprocess.PIPE,
        universal_newlines = True
    )
    stdout, stderr = process.communicate()
    info = json.loads(stdout)
    return int(float(info['format']['duration']) * 1000)

def video_convert_to_yuv(input_file, fps, output_dir, start, end):
    # 先跳到时间范围, 再精确跳到特定帧率
    ffmppeg_fmt = "ffmpeg -i %s -ss %s -vf \"select='gte(n,%d)\" -vframes %d -s 8192*4096 -pix_fmt yuv420p %s"
    output_yuv = os.path.join(output_dir, "range_%d_%d.yuv" % (start, end))
    ss_arg = "%d" % ((start - 300) // 1000) if start > 300 else "0" # 少跳转一点
    start_frame = int(start / 1000 * fps) #精确起始帧
    vframes = int((end - start) / 1000 * fps + fps) #多输出1秒钟
    ffmppeg_cmd = ffmppeg_fmt % (input_file, ss_arg, start_frame, vframes, output_yuv)
    print("[convert cmd]: %s" % ffmppeg_cmd)
    os.system(ffmppeg_cmd)
    return output_yuv
    
    ffmppeg_fmt = "ffmpeg -i %s -ss %s -t %s -s 8192*4096 -pix_fmt yuv420p %s"
    output_yuv = os.path.join(output_dir, "range_%d_%d.yuv" % (start, end))
    ss_arg = "%d.%d" % (start // 1000, start % 1000)
    
    duration = end - start
    t_arg = "%d.%d" % (duration // 1000, duration % 1000)
    ffmppeg_cmd = ffmppeg_fmt % (input_file, ss_arg, t_arg, output_yuv)
    print("[convert cmd]: %s" % ffmppeg_cmd)
    os.system(ffmppeg_cmd)
    return output_yuv

def get_yuv_task(yuv_path):
    fname = os.path.basename(yuv_path)
    task = os.path.splitext(fname)[0]
    return task

def find_mpd_files(omaf_dir):
    mpd_files = []
    for root, _, files in os.walk(omaf_dir):
        for file in files:
            if file.lower().endswith('_live.mpd'):
                mpd_files.append(os.path.join(root, file))
    return mpd_files

def get_omaf_root(omaf_mpd):
    current_dir = os.path.dirname(omaf_mpd)
    while True:
        if current_dir.endswith("omaf"):
            break            
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            break
        current_dir = parent_dir
    return current_dir

def create_omaf_files(yuv_path, output_dir, frame_cnt):
    global OUTPUT_FPS
    yuv_task = get_yuv_task(yuv_path)
    omaf_work_dir = os.path.join(output_dir, yuv_task)
    omaf_python = "./create_omaf_files.py"
    omaf_fmt = "python2 %s -s 1-5 -i %s -f %d -fr %d -q 28 34 38 -t 12 --codec 1 -p %s -o %s"
    omaf_cmd = omaf_fmt % (omaf_python, yuv_path, frame_cnt, OUTPUT_FPS, "oallfs", omaf_work_dir)

    print("[omaf cmd]: %s" % omaf_cmd)
    os.system(omaf_cmd)
    omaf_mpds = find_mpd_files(omaf_work_dir)
    return omaf_mpds[0] if len(omaf_mpds) > 0 else None

def mpd_replace_path(src, dst, omaf_work_dir):
    try:
        with open(src, 'r') as f_in:
            content = f_in.read()
        
        old_content = '="live/'
        new_content = '="%s/omaf/oallfs/dash/live/' % os.path.basename(omaf_work_dir)
        updated_content = content.replace(old_content, new_content)
        with open(dst, 'w') as f_out:
            f_out.write(updated_content)
        return True
    except IOError as e:
        print("Error: {}".format(e))
        return False

def mpd_merge_content(total_mpd, part_mpd):
    # 重写路径
    omaf_root = get_omaf_root(part_mpd)
    omaf_work_dir = os.path.dirname(omaf_root)
    part_copy_mpd = "%s_live.mpd" % omaf_work_dir
    mpd_replace_path(part_mpd, part_copy_mpd, omaf_work_dir)
    
    
    if not os.path.exists(total_mpd):
        shutil.copy(part_copy_mpd, total_mpd)
    else:
        # 合并
        # 解析第一个XML文件
        tree1 = ET.parse(total_mpd)
        root1 = tree1.getroot()
        
        # 解析第二个XML文件
        tree2 = ET.parse(part_copy_mpd)
        root2 = tree2.getroot()
        
        period_nodes = root2.findall('Period')
        # 将每个period节点重新添加到根节点（实际会移动节点位置）
        for period in period_nodes:
            root1.append(period)
        tree1.write(total_mpd)

def clean_omaf_temp_files(omaf_mpd):
    omaf_root = get_omaf_root(omaf_mpd)
    # 仅保留omaf目录
    parent_dir = os.path.dirname(omaf_root)
    for item in os.listdir(parent_dir):
        item_path = os.path.join(parent_dir, item)
        if item_path != omaf_root:
            try:
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                elif os.path.islink(item_path):
                    pass
                else:
                    pass
            except Exception as e:
                print("[remove failed]:%s: %s" % (str(e), item_path))
    # 仅保留omaf下只保留 oallfs/dash/live 和父级目录
    dashlive_dir = os.path.join(omaf_root, "oallfs/dash/live")
    dashlive_dir = dashlive_dir.replace("\\", os.path.sep)
    dashlive_dir = dashlive_dir.replace("/", os.path.sep)
    for cur_path, dirs, _ in os.walk(omaf_root):
        for dname in dirs:
            sub_path = os.path.join(cur_path, dname)
            if not (dashlive_dir.startswith(sub_path) or sub_path.startswith(dashlive_dir)):
                try:
                    shutil.rmtree(sub_path)
                except Exception as e:
                    print("[remove failed]:%s: %s" % (str(e), item_path))



def update_status(tid, progress, remain_time):
    # TODO: 绑定web服务url地址
    url = "http://127.0.0.1:5000/update_work"
    url = "http://192.22.23.41:5000/update_work"    
    data = {
        "tid" : tid,
        "progress" : progress,
        "remain_time" : remain_time
    }
    json_data = json.dumps(data)    
    req = urllib2.Request(url)    
    req.add_header('Content-Type', 'application/json')
    try:
        response = urllib2.urlopen(req, json_data)
        return response.read()
    except urllib2.HTTPError as e:
        return e.read()
    except urllib2.URLError as e:
        return str(e)
    

def create_huge_omaf_files(tid, input_file, output_dir, begin=0, end=-1, parts = 100):
    duration = video_get_duration(input_file)
    if end == -1 or end > duration:
        end = duration
    if parts == -1:
        parts = math.ceil(((end - begin) / 1000) / (3 * 60)) # 按180秒分片
        if parts > 64: # FIXME: 限制分块数量
            parts = parts // 2
    intervals = np.linspace(begin, end, parts + 1)
    # 尽量对齐 避免ffmpeg不好定位
    global INPUT_FPS
    global OUTPUT_FPS
    fps = 29.97 # TODO: 获取输入视频平均帧率
    fps = 59.94
    INPUT_FPS = fps
    
    OUTPUT_FPS = int(INPUT_FPS + 14.99) // 30 * 30
    if INPUT_FPS == OUTPUT_FPS:
        align = 300 # 按300ms对齐
    else:
        align = math.ceil(300 * OUTPUT_FPS / INPUT_FPS) # 按0.3秒向上对齐
    for i in range(1, len(intervals) - 1):
        intervals[i] = intervals[i] // align * align
    print(intervals)
    #return 
    total_mpd = os.path.join(output_dir, "huge_live.mpd")
    progress = 0.0
    step_progress = 100 / (len(intervals) - 1)
    update_status(tid, progress, 0)
    remain_time = 0
    start_time = time.time()
    for i in range(len(intervals) - 1):
        print("[create_huge] process %d / %d \n" % (i, parts))
        yuv_res = video_convert_to_yuv(input_file, fps, output_dir, intervals[i], intervals[i + 1])
        
        progress += step_progress * 0.15        
        elapse_time = time.time() - start_time
        remain_time = int(elapse_time / progress * (100 - progress))
        
        update_status(tid, progress, remain_time)
        
        print("[create_huge] create omaf...\n")
        # FIXME: omaf转出来丢失0.3S数据
        frame_cnt = int((intervals[i + 1] - intervals[i]) / 1000 * fps)
        if i + 2 == len(intervals): # 保守计算最末帧数
            frame_cnt -= int(fps / 4)
        mpd_file = create_omaf_files(yuv_res, output_dir, frame_cnt)
        
        progress += step_progress * 0.8
        elapse_time = time.time() - start_time
        remain_time = int(elapse_time / progress * (100 - progress))
        
        update_status(tid, progress, remain_time)
        
        if mpd_file is None:
            os.remove(yuv_res)
            shutil.rmtree(get_yuv_task(yuv_res))
            continue
        
        print("[create_huge] clean temp files...\n")
        clean_omaf_temp_files(mpd_file)
        try:
            os.remove(yuv_res)
        except Exception as e:
            print("[remove failed]:%s: %s" % (str(e), yuv_res))
        mpd_merge_content(total_mpd, mpd_file)
        
        progress += step_progress * 0.05
        elapse_time = time.time() - start_time
        remain_time = int(elapse_time / progress * (100 - progress))
        
        update_status(tid, progress, remain_time)
        
    print("output file: %s" % total_mpd)
    progress = 100.0
    update_status(tid, progress, 0)

def main():
    if len(sys.argv) == 1 or sys.argv[1].startswith("-"):
        print("usage: huge.py [tid_%s] [input_file] [output_dir] [begin_time=0] [end_time=-1] [parts_number=100]\n")
        return
    
    opt_argc = 0
    tid = ""
    if sys.argv[1].startswith("tid_"):
        opt_argc = 1
        tid = sys.argv[1][4:]
    else:
        tid = str(uuid.uuid1()).replace('-','')
    input_file = sys.argv[opt_argc + 1]
    output_dir = sys.argv[opt_argc + 2] if len(sys.argv) > opt_argc + 2 else os.path.dirname(input_file)
    
    begin_time = int(sys.argv[opt_argc + 3]) if len(sys.argv) > opt_argc + 3 else 0
    end_time = int(sys.argv[opt_argc + 4]) if len(sys.argv) > opt_argc + 4 else -1
    parts = int(sys.argv[opt_argc + 5]) if len(sys.argv) > opt_argc + 5 else 100
    print("huge task: %s ==> %s\n" % (input_file, output_dir))
    create_huge_omaf_files(tid, input_file, output_dir, begin_time, end_time, parts)

if __name__ == "__main__":
    main()
    