import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Paperclip, 
  FileText, 
  Clock, 
  CheckCircle2, 
  X, 
  Download,
  AlertCircle,
  Folder,
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { processFileUpload, downloadAttachment } from '../utils/fileStorage';

export default function TasksView({
  tasks = [],
  onSaveTasks,
  schedules = []
}) {
  const [activeTab, setActiveTab] = useState('Today'); // 'Today' | 'Upcoming' | 'Later' | 'Completed'
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Personal');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('23:59');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Categorize tasks into 4 sections
  const todayTasks = tasks.filter(t => !t.completed && t.dueDate === todayStr);
  const upcomingTasks = tasks.filter(t => !t.completed && t.dueDate > todayStr);
  const laterTasks = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate < todayStr));
  const completedTasks = tasks.filter(t => t.completed || t.status === 'completed');

  const getActiveTasks = () => {
    switch (activeTab) {
      case 'Today': return todayTasks;
      case 'Upcoming': return upcomingTasks;
      case 'Later': return laterTasks;
      case 'Completed': return completedTasks;
      default: return tasks;
    }
  };

  const handleToggleTask = (taskId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const isDone = !t.completed;
        return {
          ...t,
          completed: isDone,
          status: isDone ? 'completed' : 'pending'
        };
      }
      return t;
    });
    onSaveTasks(updated);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await processFileUpload(file);
      setAttachments(prev => [...prev, uploaded]);
      toast.success('Berkas berhasil dilampirkan!');
    } catch (err) {
      toast.error(err.message || 'Gagal mengunggah file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask = {
      id: editingTask ? editingTask.id : 'task_' + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      subject: subject.trim(),
      dueDate,
      dueTime,
      priority,
      status: 'pending',
      completed: false,
      description: description.trim(),
      attachments,
      updatedAt: new Date().toISOString()
    };

    const updated = editingTask
      ? tasks.map(t => t.id === editingTask.id ? newTask : t)
      : [newTask, ...tasks];

    onSaveTasks(updated);
    toast.success('Tugas tersimpan! ✨');
    setShowAddModal(false);
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAttachments([]);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Hapus tugas ini?')) {
      onSaveTasks(tasks.filter(t => t.id !== taskId));
      setSelectedTaskDetail(null);
      toast.success('Tugas dihapus.');
    }
  };

  const activeTaskList = getActiveTasks();

  return (
    <div className="w-full space-y-6 pb-12 text-[#181818] dark:text-[#EDE8DF]">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#181818] dark:text-white">
            Personal Tasks
          </h2>
          <p className="text-xs text-[#6F6A63] font-medium mt-0.5">
            Unified personal to-dos and assigned workspace tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 4 Section Tabs */}
          <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 text-xs font-bold shadow-xs">
            {[
              { id: 'Today', count: todayTasks.length },
              { id: 'Upcoming', count: upcomingTasks.length },
              { id: 'Later', count: laterTasks.length },
              { id: 'Completed', count: completedTasks.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#181818] dark:bg-white text-white dark:text-[#181818]'
                    : 'text-[#6F6A63] hover:text-[#181818] dark:hover:text-white'
                }`}
              >
                <span>{tab.id}</span>
                <span className={`text-[10px] px-1.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20 text-white dark:text-[#181818]' : 'bg-cream dark:bg-white/10'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Add Task Button */}
          <button
            onClick={() => {
              setEditingTask(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Add task
          </button>
        </div>
      </div>

      {/* Main Task List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTaskList.length === 0 ? (
          <div className="md:col-span-2 p-12 text-center rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/10 text-xs text-[#6F6A63] space-y-1">
            <p className="font-bold text-sm text-[#181818] dark:text-white">No tasks here.</p>
            <p>You're all caught up or ready to plan something new!</p>
          </div>
        ) : (
          activeTaskList.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTaskDetail(task)}
              className="p-4 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-[#181818]/12 hover:border-[#181818]/30 transition-all flex items-start justify-between gap-3 cursor-pointer shadow-xs group"
            >
              <div className="flex items-start gap-3 min-w-0">
                
                {/* Checkbox circle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTask(task.id);
                  }}
                  className={`mt-0.5 w-5 h-5 rounded-full border border-[#181818] dark:border-white/60 flex items-center justify-center transition-colors shrink-0 ${
                    task.completed 
                      ? 'bg-[#181818] text-white dark:bg-white dark:text-[#181818]' 
                      : 'hover:bg-cream-muted'
                  }`}
                >
                  {task.completed && <CheckCircle2 size={13} />}
                </button>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      task.workspaceName
                        ? 'bg-pastel-yellow text-[#181818]'
                        : 'bg-pastel-purple text-[#181818]'
                    }`}>
                      {task.workspaceName ? `🎓 ${task.workspaceName}` : 'Personal'}
                    </span>

                    {task.priority === 'High' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pastel-pink text-[#181818]">
                        High
                      </span>
                    )}
                  </div>

                  <h4 className={`font-bold text-xs leading-snug line-clamp-2 ${
                    task.completed ? 'line-through text-[#6F6A63]' : 'text-[#181818] dark:text-white'
                  }`}>
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-[11px] text-[#6F6A63] line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  {task.attachments?.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6F6A63] pt-0.5">
                      <Paperclip size={10} />
                      {task.attachments.length} attachment
                    </span>
                  )}
                </div>
              </div>

              {/* Due Date Badge */}
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-full bg-[#F7F2E8] dark:bg-[#141414] border border-[#181818]/10 text-[#181818] dark:text-[#EDE8DF]">
                  {task.dueDate || 'Today'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTaskDetail && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 rounded-[32px] w-full max-w-md p-6 space-y-4 shadow-2xl text-[#181818] dark:text-[#EDE8DF]">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-pastel-yellow text-[#181818]">
                {selectedTaskDetail.workspaceName ? `🎓 ${selectedTaskDetail.workspaceName}` : 'Personal Task'}
              </span>
              <button onClick={() => setSelectedTaskDetail(null)} className="p-1">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-lg text-[#181818] dark:text-white leading-tight">
                {selectedTaskDetail.title}
              </h3>
              <p className="text-xs text-[#6F6A63]">
                Due: {selectedTaskDetail.dueDate} at {selectedTaskDetail.dueTime || '23:59'}
              </p>
              {selectedTaskDetail.description && (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#252528] border border-[#181818]/10 text-xs text-[#181818] dark:text-white leading-relaxed">
                  {selectedTaskDetail.description}
                </div>
              )}
            </div>

            {/* Attachments list */}
            {selectedTaskDetail.attachments?.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6F6A63]">Attachments:</span>
                {selectedTaskDetail.attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#252528] border border-[#181818]/10 text-xs">
                    <span className="truncate">{att.name}</span>
                    <button onClick={() => downloadAttachment(att)} className="p-1 hover:text-blue-500">
                      <Download size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-[#181818]/10">
              <button
                onClick={() => handleDeleteTask(selectedTaskDetail.id)}
                className="flex-1 py-2 rounded-full border border-rose-500/30 text-rose-600 text-xs font-bold hover:bg-rose-500/10"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="flex-1 py-2 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] text-xs font-bold"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Add Task Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F2E8] dark:bg-[#1C1C1E] border border-[#181818]/15 dark:border-white/15 rounded-[32px] w-full max-w-md p-6 space-y-4 shadow-2xl text-[#181818] dark:text-[#EDE8DF]">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#181818]/10">
              <h3 className="font-bold text-sm">Add New Task</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-3 outline-none font-bold"
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#6F6A63] text-[10px] block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#6F6A63] text-[10px] block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-2.5 outline-none font-bold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <textarea
                placeholder="Description or notes (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-[#252528] border border-[#181818]/15 rounded-2xl p-3 outline-none resize-none"
              />

              {/* Attachment input */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#181818]/15 bg-white text-[11px] font-bold"
                >
                  <Paperclip size={12} />
                  {isUploading ? 'Uploading...' : '+ Attach PDF / File'}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#181818] dark:bg-white text-white dark:text-[#181818] font-bold text-xs"
              >
                Create Task
              </button>
            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
