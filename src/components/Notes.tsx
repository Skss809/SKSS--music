import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
  updatedAt: string;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editor state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [currentUser]);

  const fetchNotes = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notes'), 
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedNotes: Note[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedNotes.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          mood: data.mood || 'neutral',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      // Sort in descending order
      fetchedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotes(fetchedNotes);
    } catch (e) {
      console.error("Failed to fetch notes", e);
    }
    setLoading(false);
  };

  const handleCreateNew = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setMood('neutral');
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setMood(note.mood);
  };

  const handleSave = async () => {
    if (!currentUser) return alert("Please log in to save notes");
    if (!title.trim() && !content.trim()) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const noteData = {
        userId: currentUser.uid,
        title: title.trim() || 'Untitled Note',
        content: content.trim(),
        mood: mood,
        updatedAt: now
      };

      if (selectedNote) {
        await updateDoc(doc(db, 'notes', selectedNote.id), noteData);
        setNotes(notes.map(n => n.id === selectedNote.id ? { ...n, ...noteData } : n));
        setSelectedNote({ ...selectedNote, ...noteData });
      } else {
        const createData = { ...noteData, createdAt: now };
        const docRef = await addDoc(collection(db, 'notes'), createData);
        const newNote = { id: docRef.id, ...createData };
        setNotes([newNote, ...notes]);
        setSelectedNote(newNote);
      }
    } catch (e) {
      console.error("Failed to save note", e);
      alert("Failed to save note");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        handleCreateNew();
      }
    } catch (e) {
      console.error("Failed to delete note", e);
    }
  };

  const moodEmojis: Record<string, string> = {
    great: '🤩',
    good: '🙂',
    neutral: '😐',
    bad: '😔',
    awful: '😫'
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Daily Notes</h2>
        <p>Please log in using the button above to view and save your daily mood notes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-black md:bg-transparent">
      {/* Sidebar for Notes List */}
      <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 flex flex-col h-[40dvh] md:h-full">
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Daily Notes</h2>
          <button 
            onClick={handleCreateNew}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8 text-indigo-500">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No notes yet. Create your first daily note!
            </div>
          ) : (
            <div className="flex flex-col">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3 ${
                    selectedNote?.id === note.id ? 'bg-indigo-900/40 border-l-2 border-l-indigo-500' : ''
                  }`}
                >
                  <span className="text-2xl" title={note.mood}>{moodEmojis[note.mood] || '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate text-sm">{note.title}</h3>
                    <p className="text-zinc-500 truncate text-xs mt-1">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="w-full md:w-2/3 flex flex-col h-[calc(60dvh-4rem)] md:h-full">
        <div className="flex items-center gap-2 p-4 border-b border-white/10 shrink-0">
          <select 
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 shrink-0"
          >
            <option value="great">🤩 Great</option>
            <option value="good">🙂 Good</option>
            <option value="neutral">😐 Neutral</option>
            <option value="bad">😔 Bad</option>
            <option value="awful">😫 Awful</option>
          </select>
          <input 
            type="text" 
            placeholder="Note Title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-xl font-bold text-white px-2 py-1 flex-1 min-w-0 focus:outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center gap-2 shrink-0">
             {selectedNote && (
               <button 
                 onClick={() => handleDelete(selectedNote.id)}
                 className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                 title="Delete Note"
               >
                 <Trash2 size={20} />
               </button>
             )}
             <button
               onClick={handleSave}
               disabled={saving || (!title.trim() && !content.trim())}
               className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
             >
               {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               <span className="hidden sm:inline">Save</span>
             </button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-hidden flex flex-col pb-24 md:pb-4">
          <textarea 
            placeholder="How are you feeling today? What music are you listening to?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full bg-transparent text-zinc-300 resize-none focus:outline-none text-base md:text-lg leading-relaxed placeholder:text-zinc-700 custom-scrollbar"
          />
        </div>
      </div>
    </div>
  );
}
