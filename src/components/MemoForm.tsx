import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { auth, provider } from '../firebase';
import {
  signInWithPopup, signOut, onAuthStateChanged, User,
} from 'firebase/auth';
import { jsPDF } from 'jspdf';

// フォント登録を一度だけ読み込む
import '../fonts/NotoSansJP-Regular-normal';
// ↓このインポートが必要です
import { summarizeWithGemini } from '../utils/summary';

const MemoForm = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('業務');
  const [memos, setMemos] = useState<
    { id: string; title: string; body: string; category: string; createdAt?: any; updatedAt?: any; }[]
  >([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('すべて');
  const [filterPeriod, setFilterPeriod] = useState<string>('すべて');
  const [summaryResults, setSummaryResults] = useState<Record<string, string>>({});
  const [summaryOpenIds, setSummaryOpenIds] = useState<Record<string, boolean>>({});
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchMemos = async () => {
    if (!user) return;
    const q = query(collection(db, 'memos'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as {
          title: string;
          body: string;
          category: string;
          createdAt?: any;
          updatedAt?: any;
        }),
      }))
      .sort((a, b) => {
        const aTime = (a.updatedAt || a.createdAt)?.toDate?.() || new Date(0);
        const bTime = (b.updatedAt || b.createdAt)?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
    setMemos(docs);
  };

  useEffect(() => {
    fetchMemos();
  }, [user]);

  const handleSave = async () => {
    if (!user || (title.trim() === '' && body.trim() === '')) return;
    await addDoc(collection(db, 'memos'), {
      title,
      body,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user.uid,
    });
    setTitle('');
    setBody('');
    setCategory('業務');
    fetchMemos();
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditTitle(memos[index].title);
    setEditBody(memos[index].body);
    setEditCategory(memos[index].category);
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const handleUpdate = async (index: number) => {
    const targetId = memos[index].id;
    const docRef = doc(db, 'memos', targetId);
    await updateDoc(docRef, {
      title: editTitle,
      body: editBody,
      category: editCategory,
      updatedAt: new Date(),
    });
    setEditingIndex(null);
    fetchMemos();
  };

  const deleteMemo = async (id: string) => {
    await deleteDoc(doc(db, 'memos', id));
    fetchMemos();
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const exportSelectedToPDF = () => {
  const memo = memos.find((m) => m.id === selectedMemoId);
    if (!memo) return;

    const docPDF = new jsPDF();

    // 登録済みフォントを使用（だけ）
    docPDF.setFont('NotoSansJP');
    let y = 10;

    docPDF.text(`タイトル: ${memo.title}`, 10, y);
    y += 8;
    docPDF.text(`カテゴリ: ${memo.category}`, 10, y);
    y += 8;
    docPDF.text('本文:', 10, y);
    y += 6;
    const bodyLines = docPDF.splitTextToSize(memo.body, 180);
    docPDF.text(bodyLines, 10, y);

    docPDF.save(`${memo.title || 'memo'}.pdf`);
  };

  const handleSummarize = async (memoId: string, body: string) => {
    if (!apiKey) {
      console.error('APIキーが設定されていません');
      return;
    }

    const summary = await summarizeWithGemini(body, apiKey);
    setSummaryResults((prev) => ({
      ...prev,
      [memoId]: summary,
    }));
  };

  const toggleSummary = (id: string) => {
    setSummaryOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md max-w-xl mx-auto">
      <div className="mb-6 flex justify-between items-center px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 shadow-sm">
        {user ? (
          <>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              👤 {user.displayName} さんでログイン中
            </p>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-1.5 rounded-md shadow"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </>
        ) : (
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-1.5 rounded-md shadow"
            onClick={handleLogin}
          >
            Googleでログイン
          </button>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">メモを追加</h2>
        <input
          type="text"
          placeholder="✏️ タイトル"
          className="w-full mb-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="📝 本文を入力"
          rows={4}
          className="w-full mb-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        ></textarea>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="業務">業務</option>
          <option value="私用">私用</option>
        </select>

        <button
          onClick={handleSave}
          disabled={!user}
          className={`w-full text-white font-semibold py-2 px-4 rounded-lg transition duration-200 ${
            user
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          保存
        </button>
      </div>

      <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 tracking-wide">🔍 フィルター</h3>
        <div className="flex flex-wrap gap-4 items-center">
          {/* カテゴリ */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 w-40 border rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400"
          >
            <option value="すべて">すべてのカテゴリ</option>
            <option value="業務">業務</option>
            <option value="私用">私用</option>
          </select>

          {/* 期間 */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="p-2 w-40 border rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400"
          >
            <option value="すべて">すべての期間</option>
            <option value="今日">今日</option>
            <option value="今週">今週</option>
            <option value="今月">今月</option>
          </select>

          {/* 検索 */}
          <input
            type="text"
            placeholder="🔍 メモを検索"
            className="p-2 flex-grow min-w-[180px] border rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
      </div>
      {memos
        .filter((memo) => {
          // キーワード
          const keywordMatch =
            memo.title.includes(searchKeyword) || memo.body.includes(searchKeyword);

          // カテゴリ
          const categoryMatch =
            filterCategory === 'すべて' || memo.category === filterCategory;

          // 期間
          const now = new Date();
          const memoDate = (memo.updatedAt || memo.createdAt)?.toDate?.() || new Date(0);

          let periodMatch = true;
          if (filterPeriod === '今日') {
            periodMatch = memoDate.toDateString() === now.toDateString();
          } else if (filterPeriod === '今週') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            periodMatch = memoDate >= startOfWeek && memoDate < endOfWeek;
          } else if (filterPeriod === '今月') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            periodMatch = memoDate >= startOfMonth && memoDate < endOfMonth;
          }

          return keywordMatch && categoryMatch && periodMatch;
        })
        .map((memo, index) => (
          <div key={memo.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mt-4">
            {editingIndex === index ? (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900 rounded-xl shadow-inner p-5 mt-6">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full mb-2 p-2 border rounded dark:bg-gray-700 dark:text-white"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full mb-2 p-2 border rounded dark:bg-gray-700 dark:text-white"
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full mb-3 p-2 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    <option value="業務">業務</option>
                    <option value="私用">私用</option>
                  </select>

                  <div className="flex gap-3">
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      onClick={() => handleUpdate(index)}
                    >
                      保存
                    </button>
                    <button
                      className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
                      onClick={handleCancel}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div key={memo.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {memo.title} <span className="text-sm text-gray-500 dark:text-gray-400">（{memo.category}）</span>
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      更新: {(memo.updatedAt || memo.createdAt)?.toDate()?.toLocaleString('ja-JP')}
                    </span>
                  </div>

                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-3">{memo.body}</p>

                  <div className="flex gap-3">
                    <button
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      onClick={() => handleEdit(index)}
                    >
                      編集
                    </button>
                    <button
                      className="text-red-600 dark:text-red-400 hover:underline"
                      onClick={() => deleteMemo(memo.id)}
                    >
                      削除
                    </button>
                    <button
                      className="text-green-600 dark:text-green-400 hover:underline"
                      onClick={() => {
                        setSelectedMemoId(memo.id);
                        exportSelectedToPDF();
                      }}
                    >
                      PDF出力
                    </button>
                    <button
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      onClick={() => handleSummarize(memo.id, memo.body)}
                    >
                      要約
                    </button>
                  </div>
                  {summaryResults[memo.id] && (
                    <div className="mt-3">
                      <button
                        className="text-sm text-blue-600 dark:text-blue-400 underline"
                        onClick={() => toggleSummary(memo.id)}
                      >
                        {summaryOpenIds[memo.id] ? '▲ 要約を隠す' : '▼ 要約を見る'}
                      </button>

                      {summaryOpenIds[memo.id] && (
                        <div className="mt-2 p-3 bg-yellow-100 dark:bg-yellow-900 text-sm rounded">
                          <strong>要約：</strong>{summaryResults[memo.id]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
    </div>
  );
};

export default MemoForm;