import React, { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  CheckCircle2,
  Circle,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart2,
  Archive,
  ListChecks,
  Star,
  Trash2,
  Edit3,
  Check,
} from "lucide-react";

const firebaseConfig = {
  apiKey: "AIzaSyA_5ZdkfT4-6qmr4W2LjYkJNRjiyrd8Db4",
  authDomain: "checklist-95056.firebaseapp.com",
  projectId: "checklist-95056",
  storageBucket: "checklist-95056.firebasestorage.app",
  messagingSenderId: "123578607793",
  appId: "1:123578607793:web:1564f6fec8b84de4bc5a90",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_ID = "user_main";

const DAYS_KR = ["월", "화", "수", "목", "금", "토", "일"];
const MONTHS_KR = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const DEFAULT_CATEGORIES = [
  { id: "health", name: "건강", emoji: "💪" },
  { id: "mind", name: "마음", emoji: "🧘" },
  { id: "study", name: "학습", emoji: "📚" },
  { id: "life", name: "생활", emoji: "🏠" },
  { id: "social", name: "소셜", emoji: "👥" },
  { id: "creative", name: "창작", emoji: "🎨" },
];

const EMOJI_LIST = [
  "💪",
  "🧘",
  "📚",
  "🏠",
  "👥",
  "🎨",
  "🏃",
  "🍎",
  "💤",
  "✍️",
  "🎯",
  "🌱",
  "💡",
  "🎵",
  "🧹",
  "💰",
  "🌅",
  "🚴",
  "🏋️",
  "📝",
  "🧠",
  "❤️",
  "🌿",
  "☀️",
  "🔥",
  "⭐",
  "🎉",
  "🙏",
  "🌊",
  "🦋",
];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

async function loadData(path) {
  try {
    const ref = doc(db, "users", USER_ID, ...path.split("/"));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}
async function saveData(path, data) {
  try {
    const ref = doc(db, "users", USER_ID, ...path.split("/"));
    await setDoc(ref, data, { merge: true });
  } catch (e) {
    console.error(e);
  }
}
async function loadCollection(path) {
  try {
    const ref = collection(db, "users", USER_ID, ...path.split("/"));
    const snap = await getDocs(ref);
    const result = {};
    snap.forEach((d) => {
      result[d.id] = d.data();
    });
    return result;
  } catch {
    return {};
  }
}
async function deleteData(path) {
  try {
    const ref = doc(db, "users", USER_ID, ...path.split("/"));
    await deleteDoc(ref);
  } catch (e) {
    console.error(e);
  }
}

export default function App() {
  const [tab, setTab] = useState("checklist");
  const [today] = useState(new Date());
  const [currentWeekMonday, setCurrentWeekMonday] = useState(
    getMonday(new Date())
  );

  // ★ selectedDay를 App 최상위에서 관리 → WeekHeader와 ChecklistTab이 공유
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });

  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [completions, setCompletions] = useState({});
  const [todayTasks, setTodayTasks] = useState({});
  const [archive, setArchive] = useState({});
  const [loading, setLoading] = useState(true);

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedStatDate, setSelectedStatDate] = useState(null);
  const [statCalDate, setStatCalDate] = useState(new Date());
  const [archiveMonth, setArchiveMonth] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [habitsData, catsData, completionsData, tasksData, archiveData] =
        await Promise.all([
          loadCollection("habits"),
          loadData("settings/categories"),
          loadCollection("completions"),
          loadCollection("todayTasks"),
          loadCollection("archive"),
        ]);
      if (Object.keys(habitsData).length > 0) {
        setHabits(Object.entries(habitsData).map(([id, d]) => ({ id, ...d })));
      }
      if (catsData?.list) setCategories(catsData.list);
      setCompletions(completionsData);
      setTodayTasks(tasksData);
      setArchive(archiveData);
      setLoading(false);
    }
    load();
  }, []);

  const saveHabit = useCallback(async (habit) => {
    const id = habit.id || `habit_${Date.now()}`;
    const data = { ...habit, id };
    await saveData(`habits/${id}`, data);
    setHabits((prev) => {
      const exists = prev.find((h) => h.id === id);
      if (exists) return prev.map((h) => (h.id === id ? data : h));
      return [...prev, data];
    });
  }, []);

  const deleteHabit = useCallback(async (id) => {
    await deleteData(`habits/${id}`);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const toggleCompletion = useCallback(
    async (habitId, dateStr) => {
      const key = `${dateStr}_${habitId}`;
      const current = completions[key];
      const newVal = current?.done ? null : { done: true, ts: Date.now() };
      if (newVal) {
        await saveData(`completions/${key}`, newVal);
        setCompletions((prev) => ({ ...prev, [key]: newVal }));
      } else {
        await deleteData(`completions/${key}`);
        setCompletions((prev) => {
          const n = { ...prev };
          delete n[key];
          return n;
        });
      }
    },
    [completions]
  );

  const saveTodayTask = useCallback(async (dateStr, tasks) => {
    await saveData(`todayTasks/${dateStr}`, { tasks });
    setTodayTasks((prev) => ({ ...prev, [dateStr]: { tasks } }));
  }, []);

  const toggleTask = useCallback(
    async (dateStr, idx) => {
      const current = todayTasks[dateStr]?.tasks || [];
      const updated = current.map((t, i) =>
        i === idx ? { ...t, done: !t.done } : t
      );
      await saveTodayTask(dateStr, updated);
    },
    [todayTasks, saveTodayTask]
  );

  const archiveMonth_ = useCallback(
    async (monthKey) => {
      const monthHabits = habits.filter((h) => {
        const start = h.startMonth || monthKey;
        return start <= monthKey;
      });
      const data = {
        monthKey,
        habits: monthHabits,
        categories,
        archivedAt: Date.now(),
      };
      await saveData(`archive/${monthKey}`, data);
      setArchive((prev) => ({ ...prev, [monthKey]: data }));
    },
    [habits, categories]
  );

  const isHabitActiveOnDate = (habit, date) => {
    const dateMonthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    if (habit.startMonth && dateMonthKey < habit.startMonth) return false;
    if (habit.endMonth && dateMonthKey > habit.endMonth) return false;
    if (
      !habit.startMonth &&
      habit.startDate &&
      formatDate(date) < habit.startDate
    )
      return false;
    if (!habit.endMonth && habit.endDate && formatDate(date) > habit.endDate)
      return false;
    const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return habit.days?.includes(dayIdx);
  };

  const todayStr = formatDate(today);
  const weekDates = getWeekDates(currentWeekMonday);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <p style={{ color: "#888", marginTop: 16 }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* ★ selectedDay, setSelectedDay를 WeekHeader에 전달 */}
      <WeekHeader
        weekDates={weekDates}
        today={today}
        currentWeekMonday={currentWeekMonday}
        setCurrentWeekMonday={setCurrentWeekMonday}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
        calendarDate={calendarDate}
        setCalendarDate={setCalendarDate}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
      />
      <div style={styles.content}>
        {tab === "checklist" && (
          <ChecklistTab
            habits={habits}
            categories={categories}
            weekDates={weekDates}
            today={today}
            completions={completions}
            toggleCompletion={toggleCompletion}
            isHabitActiveOnDate={isHabitActiveOnDate}
            showAddHabit={showAddHabit}
            setShowAddHabit={setShowAddHabit}
            editingHabit={editingHabit}
            setEditingHabit={setEditingHabit}
            saveHabit={saveHabit}
            deleteHabit={deleteHabit}
            showAddCategory={showAddCategory}
            setShowAddCategory={setShowAddCategory}
            setCategories={setCategories}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />
        )}
        {tab === "today" && (
          <TodayTab
            today={today}
            todayStr={todayStr}
            todayTasks={todayTasks}
            saveTodayTask={saveTodayTask}
            toggleTask={toggleTask}
            showAddTask={showAddTask}
            setShowAddTask={setShowAddTask}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            habits={habits}
            categories={categories}
            completions={completions}
            todayTasks={todayTasks}
            today={today}
            isHabitActiveOnDate={isHabitActiveOnDate}
            statCalDate={statCalDate}
            setStatCalDate={setStatCalDate}
            selectedStatDate={selectedStatDate}
            setSelectedStatDate={setSelectedStatDate}
          />
        )}
        {tab === "archive" && (
          <ArchiveTab
            archive={archive}
            archiveMonth_={archiveMonth_}
            today={today}
            archiveMonth={archiveMonth}
            setArchiveMonth={setArchiveMonth}
            categories={categories}
          />
        )}
      </div>
      <BottomTab tab={tab} setTab={setTab} />
    </div>
  );
}

// ─── Week Header ─────────────────────────────────────────────────────
// ★ 날짜 클릭 시 selectedDay 변경, 시각적으로 선택된 날짜 강조
function WeekHeader({
  weekDates,
  today,
  currentWeekMonday,
  setCurrentWeekMonday,
  showCalendar,
  setShowCalendar,
  calendarDate,
  setCalendarDate,
  selectedDay,
  setSelectedDay,
}) {
  const prevWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() - 7);
    setCurrentWeekMonday(d);
    setSelectedDay(0);
  };
  const nextWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() + 7);
    setCurrentWeekMonday(d);
    setSelectedDay(0);
  };
  const weekEnd = new Date(currentWeekMonday);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const monthLabel =
    currentWeekMonday.getMonth() === weekEnd.getMonth()
      ? `${currentWeekMonday.getFullYear()}년 ${
          MONTHS_KR[currentWeekMonday.getMonth()]
        }`
      : `${MONTHS_KR[currentWeekMonday.getMonth()]} - ${
          MONTHS_KR[weekEnd.getMonth()]
        }`;

  return (
    <div style={styles.weekHeader}>
      <div style={styles.weekHeaderTop}>
        <button style={styles.weekNavBtn} onClick={prevWeek}>
          <ChevronLeft size={18} color="#555" />
        </button>
        <button
          style={styles.monthLabel}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <Calendar size={14} color="#888" style={{ marginRight: 4 }} />
          <span style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>
            {monthLabel}
          </span>
        </button>
        <button style={styles.weekNavBtn} onClick={nextWeek}>
          <ChevronRight size={18} color="#555" />
        </button>
      </div>
      <div style={styles.weekDays}>
        {weekDates.map((date, i) => {
          const isToday = formatDate(date) === formatDate(today);
          const isSelected = i === selectedDay;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: isSelected ? "#222" : "#aaa",
                  fontWeight: isSelected ? 700 : 400,
                }}
              >
                {DAYS_KR[i]}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  background: isSelected
                    ? "#222"
                    : isToday
                    ? "#f0f0f0"
                    : "transparent",
                  color: isSelected ? "#fff" : "#333",
                  fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                }}
              >
                {date.getDate()}
              </div>
              {isToday && (
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: isSelected ? "#fff" : "#222",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      {showCalendar && (
        <MiniCalendar
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          today={today}
          onSelect={(date) => {
            setCurrentWeekMonday(getMonday(date));
            const day = date.getDay();
            setSelectedDay(day === 0 ? 6 : day - 1);
            setShowCalendar(false);
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}

// ─── Mini Calendar ───────────────────────────────────────────────────
function MiniCalendar({
  calendarDate,
  setCalendarDate,
  today,
  onSelect,
  onClose,
}) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={styles.miniCalWrap}>
      <div style={styles.miniCalHeader}>
        <button
          style={styles.iconBtn}
          onClick={() => {
            const d = new Date(calendarDate);
            d.setMonth(d.getMonth() - 1);
            setCalendarDate(d);
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          {year}년 {MONTHS_KR[month]}
        </span>
        <button
          style={styles.iconBtn}
          onClick={() => {
            const d = new Date(calendarDate);
            d.setMonth(d.getMonth() + 1);
            setCalendarDate(d);
          }}
        >
          <ChevronRight size={16} />
        </button>
        <button
          style={{ ...styles.iconBtn, marginLeft: "auto" }}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <div style={styles.miniCalGrid}>
        {DAYS_KR.map((d) => (
          <div key={d} style={styles.miniCalDayLabel}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          return (
            <button
              key={d}
              style={{
                ...styles.miniCalDay,
                background: isToday ? "#222" : "transparent",
                color: isToday ? "#fff" : "#333",
                fontWeight: isToday ? 700 : 400,
              }}
              onClick={() => onSelect(new Date(year, month, d))}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Checklist Tab ───────────────────────────────────────────────────
// ★ selectedDay, setSelectedDay를 props로 받아서 사용 (App에서 관리)
function ChecklistTab({
  habits,
  categories,
  weekDates,
  today,
  completions,
  toggleCompletion,
  isHabitActiveOnDate,
  showAddHabit,
  setShowAddHabit,
  editingHabit,
  setEditingHabit,
  saveHabit,
  deleteHabit,
  showAddCategory,
  setShowAddCategory,
  setCategories,
  selectedDay,
  setSelectedDay,
}) {
  const selectedDate = weekDates[selectedDay] || weekDates[0];
  const dateStr = formatDate(selectedDate);
  const dayHabits = habits.filter((h) => isHabitActiveOnDate(h, selectedDate));
  const getCat = (catId) =>
    categories.find((c) => c.id === catId) || categories[0];

  return (
    <div style={styles.tabContent}>
      <div style={styles.sectionLabel}>
        {selectedDate.getMonth() + 1}/{selectedDate.getDate()} (
        {DAYS_KR[selectedDay]}) 습관
        <span style={{ color: "#aaa", fontSize: 12, marginLeft: 8 }}>
          {
            dayHabits.filter((h) => completions[`${dateStr}_${h.id}`]?.done)
              .length
          }
          /{dayHabits.length} 완료
        </span>
      </div>

      {dayHabits.length === 0 ? (
        <div style={styles.emptyState}>
          <p>이 날 설정된 습관이 없어요</p>
          <p style={{ fontSize: 12, color: "#bbb" }}>
            + 버튼으로 습관을 추가해보세요
          </p>
        </div>
      ) : (
        dayHabits.map((habit) => {
          const cat = getCat(habit.categoryId);
          const done = completions[`${dateStr}_${habit.id}`]?.done;
          return (
            <div
              key={habit.id}
              style={{ ...styles.habitCard, opacity: done ? 0.7 : 1 }}
            >
              <button
                style={styles.checkBtn}
                onClick={() => toggleCompletion(habit.id, dateStr)}
              >
                {done ? (
                  <CheckCircle2 size={24} color="#4CAF50" fill="#4CAF50" />
                ) : (
                  <Circle size={24} color="#ddd" />
                )}
              </button>
              <div style={styles.habitInfo}>
                <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                <div>
                  <p
                    style={{
                      ...styles.habitName,
                      textDecoration: done ? "line-through" : "none",
                      color: done ? "#aaa" : "#222",
                    }}
                  >
                    {habit.name}
                  </p>
                  <p style={styles.habitMeta}>{cat.name}</p>
                </div>
              </div>
              <button
                style={styles.editBtn}
                onClick={() => {
                  setEditingHabit(habit);
                  setShowAddHabit(true);
                }}
              >
                <Edit3 size={14} color="#bbb" />
              </button>
            </div>
          );
        })
      )}

      <button
        style={styles.fab}
        onClick={() => {
          setEditingHabit(null);
          setShowAddHabit(true);
        }}
      >
        <Plus size={24} color="#fff" />
      </button>

      {showAddHabit && (
        <HabitModal
          habit={editingHabit}
          categories={categories}
          onSave={(h) => {
            saveHabit(h);
            setShowAddHabit(false);
            setEditingHabit(null);
          }}
          onClose={() => {
            setShowAddHabit(false);
            setEditingHabit(null);
          }}
          onDelete={
            editingHabit
              ? () => {
                  deleteHabit(editingHabit.id);
                  setShowAddHabit(false);
                  setEditingHabit(null);
                }
              : null
          }
          setShowAddCategory={setShowAddCategory}
          setCategories={setCategories}
          showAddCategory={showAddCategory}
        />
      )}
    </div>
  );
}

// ─── Habit Modal ─────────────────────────────────────────────────────
function HabitModal({
  habit,
  categories,
  onSave,
  onClose,
  onDelete,
  setShowAddCategory,
  setCategories,
  showAddCategory,
}) {
  const [name, setName] = useState(habit?.name || "");
  const [categoryId, setCategoryId] = useState(
    habit?.categoryId || categories[0]?.id
  );
  const [days, setDays] = useState(habit?.days || [0, 1, 2, 3, 4]);
  const [showManageCategories, setShowManageCategories] = useState(false);

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonthNum = now.getMonth() + 1;
  const defaultMonthKey = `${nowYear}-${String(nowMonthNum).padStart(2, "0")}`;
  const [startMonth, setStartMonth] = useState(
    habit?.startMonth || defaultMonthKey
  );
  const [endMonth, setEndMonth] = useState(habit?.endMonth || "");

  const toggleDay = (d) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(habit || {}),
      name: name.trim(),
      categoryId,
      days,
      startMonth,
      endMonth,
    });
  };

  const yearOptions = Array.from({ length: 8 }, (_, i) => nowYear - 2 + i);
  const startYear = parseInt(startMonth.split("-")[0]);
  const startMonthNum = parseInt(startMonth.split("-")[1]);
  const endYear = endMonth ? parseInt(endMonth.split("-")[0]) : nowYear;
  const endMonthNum = endMonth ? parseInt(endMonth.split("-")[1]) : nowMonthNum;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {habit ? "습관 수정" : "새 습관 추가"}
          </h3>
          <button onClick={onClose}>
            <X size={20} color="#888" />
          </button>
        </div>

        <label style={styles.label}>습관 이름</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 아침 운동 30분"
        />

        <label style={styles.label}>카테고리</label>
        <div style={styles.catGrid}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              style={{
                ...styles.catChip,
                background: categoryId === cat.id ? "#222" : "#f5f5f5",
                color: categoryId === cat.id ? "#fff" : "#333",
              }}
              onClick={() => setCategoryId(cat.id)}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
          <button
            style={{ ...styles.catChip, background: "#f0f0f0", color: "#888" }}
            onClick={() => setShowManageCategories(true)}
          >
            ✏️ 관리
          </button>
        </div>

        <label style={styles.label}>반복 요일</label>
        <div style={styles.dayGrid}>
          {DAYS_KR.map((d, i) => (
            <button
              key={i}
              style={{
                ...styles.dayChip,
                background: days.includes(i) ? "#222" : "#f5f5f5",
                color: days.includes(i) ? "#fff" : "#333",
              }}
              onClick={() => toggleDay(i)}
            >
              {d}
            </button>
          ))}
        </div>

        <label style={styles.label}>시작 월</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select
            style={styles.selectInput}
            value={startYear}
            onChange={(e) =>
              setStartMonth(
                `${e.target.value}-${String(startMonthNum).padStart(2, "0")}`
              )
            }
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            style={styles.selectInput}
            value={startMonthNum}
            onChange={(e) =>
              setStartMonth(
                `${startYear}-${String(e.target.value).padStart(2, "0")}`
              )
            }
          >
            {MONTHS_KR.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <label style={styles.label}>종료 월 (선택사항)</label>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <select
            style={{ ...styles.selectInput, opacity: endMonth ? 1 : 0.4 }}
            value={endYear}
            onChange={(e) =>
              setEndMonth(
                `${e.target.value}-${String(endMonthNum).padStart(2, "0")}`
              )
            }
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            style={{ ...styles.selectInput, opacity: endMonth ? 1 : 0.4 }}
            value={endMonth ? endMonthNum : ""}
            onChange={(e) => {
              if (!e.target.value) {
                setEndMonth("");
                return;
              }
              setEndMonth(
                `${endYear}-${String(e.target.value).padStart(2, "0")}`
              );
            }}
          >
            <option value="">종료 없음</option>
            {MONTHS_KR.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          {endMonth && (
            <button style={styles.iconBtn} onClick={() => setEndMonth("")}>
              <X size={16} color="#ffaaaa" />
            </button>
          )}
        </div>

        <p style={styles.monthHint}>
          💡 {startMonth}부터{endMonth ? ` ${endMonth}까지` : " 계속"} 저장되는
          습관입니다
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {onDelete && (
            <button style={styles.deleteBtn} onClick={onDelete}>
              <Trash2 size={16} /> 삭제
            </button>
          )}
          <button style={styles.saveBtn} onClick={handleSave}>
            <Check size={16} /> 저장
          </button>
        </div>

        {showManageCategories && (
          <CategoryManageModal
            categories={categories}
            setCategories={setCategories}
            onClose={() => setShowManageCategories(false)}
            onAddNew={() => {
              setShowManageCategories(false);
              setShowAddCategory(true);
            }}
          />
        )}
        {showAddCategory && (
          <AddCategoryModal
            onSave={(cat) => {
              setCategories((prev) => {
                const updated = [...prev, cat];
                saveData("settings/categories", { list: updated });
                return updated;
              });
              setCategoryId(cat.id);
              setShowAddCategory(false);
            }}
            onClose={() => setShowAddCategory(false)}
          />
        )}
      </div>
    </div>
  );
}

function CategoryManageModal({ categories, setCategories, onClose, onAddNew }) {
  const [editingCat, setEditingCat] = useState(null);

  const handleEditSave = (updated) => {
    setCategories((prev) => {
      const newList = prev.map((c) => (c.id === updated.id ? updated : c));
      saveData("settings/categories", { list: newList });
      return newList;
    });
    setEditingCat(null);
  };

  const handleDelete = (catId) => {
    setCategories((prev) => {
      const newList = prev.filter((c) => c.id !== catId);
      saveData("settings/categories", { list: newList });
      return newList;
    });
  };

  if (editingCat) {
    return (
      <AddCategoryModal
        editingCategory={editingCat}
        onSave={handleEditSave}
        onClose={() => setEditingCat(null)}
      />
    );
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxHeight: "80vh" }}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>카테고리 관리</h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "#fafafa",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>{cat.emoji}</span>
              <span
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#222",
                }}
              >
                {cat.name}
              </span>
              <button style={styles.editBtn} onClick={() => setEditingCat(cat)}>
                <Edit3 size={16} color="#888" />
              </button>
              <button
                style={styles.editBtn}
                onClick={() => handleDelete(cat.id)}
              >
                <Trash2 size={16} color="#ffaaaa" />
              </button>
            </div>
          ))}
        </div>
        <button
          style={{ ...styles.saveBtn, background: "#f5f5f5", color: "#333" }}
          onClick={onAddNew}
        >
          <Plus size={16} /> 새 카테고리 추가
        </button>
      </div>
    </div>
  );
}

function AddCategoryModal({ onSave, onClose, editingCategory }) {
  const [name, setName] = useState(editingCategory?.name || "");
  const [emoji, setEmoji] = useState(editingCategory?.emoji || "⭐");

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxHeight: "70vh" }}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {editingCategory ? "카테고리 수정" : "카테고리 추가"}
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <label style={styles.label}>이름</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="카테고리 이름"
        />
        <label style={styles.label}>이모티콘 선택</label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              style={{
                fontSize: 22,
                padding: 6,
                borderRadius: 8,
                background: emoji === e ? "#222" : "#f5f5f5",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          style={styles.saveBtn}
          onClick={() => {
            if (!name.trim()) return;
            onSave({
              id: editingCategory?.id || `cat_${Date.now()}`,
              name: name.trim(),
              emoji,
            });
          }}
        >
          저장
        </button>
      </div>
    </div>
  );
}

function TodayTab({
  today,
  todayStr,
  todayTasks,
  saveTodayTask,
  toggleTask,
  showAddTask,
  setShowAddTask,
}) {
  const [newTask, setNewTask] = useState("");
  const tasks = todayTasks[todayStr]?.tasks || [];
  const doneCount = tasks.filter((t) => t.done).length;

  const addTask = () => {
    if (!newTask.trim() || tasks.length >= 3) return;
    const updated = [...tasks, { text: newTask.trim(), done: false }];
    saveTodayTask(todayStr, updated);
    setNewTask("");
    setShowAddTask(false);
  };

  const removeTask = (idx) => {
    const updated = tasks.filter((_, i) => i !== idx);
    saveTodayTask(todayStr, updated);
  };

  return (
    <div style={styles.tabContent}>
      <div style={styles.todayHeader}>
        <div>
          <h2 style={styles.todayTitle}>오늘의 핵심 3가지</h2>
          <p style={styles.todaySubtitle}>
            {today.getMonth() + 1}월 {today.getDate()}일 (
            {DAYS_KR[today.getDay() === 0 ? 6 : today.getDay() - 1]})
          </p>
        </div>
        <div style={styles.todayProgress}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#222" }}>
            {doneCount}
          </span>
          <span style={{ fontSize: 14, color: "#aaa" }}>/3</span>
        </div>
      </div>
      <div style={styles.progressBarWrap}>
        <div
          style={{ ...styles.progressBar, width: `${(doneCount / 3) * 100}%` }}
        />
      </div>
      <div style={{ marginTop: 24 }}>
        {tasks.map((task, idx) => (
          <div key={idx} style={styles.taskCard}>
            <button
              onClick={() => toggleTask(todayStr, idx)}
              style={styles.checkBtn}
            >
              {task.done ? (
                <CheckCircle2 size={26} color="#4CAF50" fill="#4CAF50" />
              ) : (
                <Circle size={26} color="#ddd" />
              )}
            </button>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: task.done ? "#bbb" : "#222",
                  textDecoration: task.done ? "line-through" : "none",
                }}
              >
                {task.text}
              </p>
              <p style={{ fontSize: 11, color: "#ccc" }}>핵심 과제 {idx + 1}</p>
            </div>
            <button onClick={() => removeTask(idx)}>
              <X size={16} color="#ddd" />
            </button>
          </div>
        ))}
        {tasks.length < 3 && (
          <button
            style={styles.addTaskBtn}
            onClick={() => setShowAddTask(true)}
          >
            <Plus size={18} color="#888" />
            <span style={{ color: "#888", fontSize: 14 }}>
              핵심 과제 추가 ({tasks.length}/3)
            </span>
          </button>
        )}
      </div>
      <div style={styles.quoteCard}>
        <Star size={16} color="#f5a623" style={{ marginBottom: 8 }} />
        <p style={styles.quoteText}>
          "작은 것들이 완벽함을 만들고,
          <br />
          완벽함은 작은 것이 아니다."
        </p>
        <p style={styles.quoteAuthor}>— 미켈란젤로</p>
      </div>
      {showAddTask && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>핵심 과제 추가</h3>
              <button onClick={() => setShowAddTask(false)}>
                <X size={20} />
              </button>
            </div>
            <label style={styles.label}>오늘 반드시 해야 할 일</label>
            <input
              style={styles.input}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="예) 프레젠테이션 완성하기"
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              autoFocus
            />
            <button style={styles.saveBtn} onClick={addTask}>
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsTab({
  habits,
  categories,
  completions,
  todayTasks,
  today,
  isHabitActiveOnDate,
  statCalDate,
  setStatCalDate,
  selectedStatDate,
  setSelectedStatDate,
}) {
  const year = statCalDate.getFullYear();
  const month = statCalDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getDayHabitRate = (day) => {
    const date = new Date(year, month, day);
    const activeHabits = habits.filter((h) => isHabitActiveOnDate(h, date));
    if (activeHabits.length === 0) return null;
    const done = activeHabits.filter(
      (h) => completions[`${formatDate(date)}_${h.id}`]?.done
    ).length;
    return done / activeHabits.length;
  };

  const getDayTaskRate = (day) => {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const tasks = todayTasks[dateStr]?.tasks || [];
    if (tasks.length === 0) return null;
    const done = tasks.filter((t) => t.done).length;
    return done / tasks.length;
  };

  const getWeeklyStats = () => {
    const weeks = [];
    let d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      const monday = getMonday(d);
      const weekKey = formatDate(monday);
      if (!weeks.find((w) => w.key === weekKey)) {
        const weekDates = getWeekDates(monday).filter(
          (wd) => wd.getMonth() === month
        );
        const catStats = categories
          .map((cat) => {
            const catHabits = habits.filter((h) => h.categoryId === cat.id);
            let total = 0,
              done = 0;
            weekDates.forEach((wd) => {
              catHabits.forEach((h) => {
                if (isHabitActiveOnDate(h, wd)) {
                  total++;
                  if (completions[`${formatDate(wd)}_${h.id}`]?.done) done++;
                }
              });
            });
            return {
              ...cat,
              total,
              done,
              rate: total > 0 ? Math.round((done / total) * 100) : null,
            };
          })
          .filter((c) => c.total > 0);
        weeks.push({ key: weekKey, monday, weekDates, catStats });
      }
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  };

  const getMonthlyRate = () => {
    let total = 0,
      done = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      habits.forEach((h) => {
        if (isHabitActiveOnDate(h, date)) {
          total++;
          if (completions[`${formatDate(date)}_${h.id}`]?.done) done++;
        }
      });
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const weeks = getWeeklyStats();
  const monthlyRate = getMonthlyRate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getHeatColor = (rate) => {
    if (rate === null) return "#f9f9f9";
    if (rate === 0) return "#f0f0f0";
    if (rate < 0.33) return "#ffe0e0";
    if (rate < 0.66) return "#ffb3b3";
    return "#ff6b6b";
  };

  const getHabitColor = (rate) => {
    if (rate === null) return "#f9f9f9";
    if (rate === 0) return "#f0f0f0";
    if (rate < 0.5) return "#e8f5e9";
    if (rate < 0.8) return "#a5d6a7";
    return "#4CAF50";
  };

  return (
    <div style={styles.tabContent}>
      <div style={styles.statCalNav}>
        <button
          style={styles.iconBtn}
          onClick={() => {
            const d = new Date(statCalDate);
            d.setMonth(d.getMonth() - 1);
            setStatCalDate(d);
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>
          {year}년 {MONTHS_KR[month]}
        </span>
        <button
          style={styles.iconBtn}
          onClick={() => {
            const d = new Date(statCalDate);
            d.setMonth(d.getMonth() + 1);
            setStatCalDate(d);
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}
      >
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#4CAF50" }} />
          습관 달성
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#ff6b6b" }} />할 일
          달성
        </div>
      </div>
      <div style={styles.statCalGrid}>
        {DAYS_KR.map((d) => (
          <div key={d} style={styles.miniCalDayLabel}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const habitRate = getDayHabitRate(d);
          const taskRate = getDayTaskRate(d);
          const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          const dateStr = formatDate(new Date(year, month, d));
          const isSelected = selectedStatDate === dateStr;
          return (
            <button
              key={d}
              style={{
                ...styles.statCalDay,
                background: getHabitColor(habitRate),
                border: isToday
                  ? "2px solid #222"
                  : isSelected
                  ? "2px solid #4CAF50"
                  : "2px solid transparent",
                position: "relative",
              }}
              onClick={() => setSelectedStatDate(isSelected ? null : dateStr)}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 400,
                  color: "#333",
                }}
              >
                {d}
              </span>
              {taskRate !== null && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: getHeatColor(taskRate),
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      {selectedStatDate && (
        <SelectedDateDetail
          dateStr={selectedStatDate}
          habits={habits}
          categories={categories}
          completions={completions}
          todayTasks={todayTasks}
          isHabitActiveOnDate={isHabitActiveOnDate}
          onClose={() => setSelectedStatDate(null)}
        />
      )}
      <div style={styles.monthlyRateCard}>
        <p style={styles.sectionLabel}>이번 달 전체 달성률</p>
        <div style={styles.monthlyRateBar}>
          <div
            style={{ ...styles.monthlyRateFill, width: `${monthlyRate}%` }}
          />
        </div>
        <p
          style={{
            textAlign: "right",
            fontWeight: 700,
            color: "#222",
            marginTop: 4,
          }}
        >
          {monthlyRate}%
        </p>
      </div>
      <p style={{ ...styles.sectionLabel, marginTop: 24 }}>
        주별 카테고리 달성률
      </p>
      {weeks.map((week) => (
        <div key={week.key} style={styles.weekStatCard}>
          <p style={styles.weekStatTitle}>
            {week.monday.getMonth() + 1}/{week.monday.getDate()} 주
          </p>
          <div style={styles.pieRow}>
            {week.catStats.map((cat) => (
              <div key={cat.id} style={styles.pieItem}>
                <MiniPie rate={cat.rate ?? 0} color={getCatColor(cat.id)} />
                <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                <span style={{ fontSize: 10, color: "#888" }}>
                  {cat.rate ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p style={{ ...styles.sectionLabel, marginTop: 24 }}>
        오늘 할 일 달성 현황
      </p>
      <div style={styles.taskStatGrid}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const rate = getDayTaskRate(d);
          return (
            <div
              key={d}
              style={{ ...styles.taskStatDot, background: getHeatColor(rate) }}
            >
              <span style={{ fontSize: 9, color: "#666" }}>{d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCatColor(catId) {
  const colors = {
    health: "#4CAF50",
    mind: "#9C27B0",
    study: "#2196F3",
    life: "#FF9800",
    social: "#E91E63",
    creative: "#00BCD4",
  };
  return colors[catId] || "#888";
}

function MiniPie({ rate, color }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  return (
    <svg width={44} height={44} viewBox="0 0 44 44">
      <circle
        cx={22}
        cy={22}
        r={r}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={5}
      />
      <circle
        cx={22}
        cy={22}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text
        x={22}
        y={26}
        textAnchor="middle"
        fontSize={9}
        fill="#333"
        fontWeight="700"
      >
        {rate}%
      </text>
    </svg>
  );
}

function SelectedDateDetail({
  dateStr,
  habits,
  categories,
  completions,
  todayTasks,
  isHabitActiveOnDate,
  onClose,
}) {
  const date = parseDate(dateStr);
  const activeHabits = habits.filter((h) => isHabitActiveOnDate(h, date));
  const tasks = todayTasks[dateStr]?.tasks || [];
  const getCat = (catId) =>
    categories.find((c) => c.id === catId) || categories[0];

  return (
    <div style={styles.detailCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h4 style={{ fontWeight: 700, color: "#222" }}>
          {date.getMonth() + 1}/{date.getDate()} 상세
        </h4>
        <button onClick={onClose}>
          <X size={16} color="#888" />
        </button>
      </div>
      {activeHabits.length > 0 && (
        <>
          <p style={styles.label}>습관</p>
          {activeHabits.map((h) => {
            const done = completions[`${dateStr}_${h.id}`]?.done;
            const cat = getCat(h.categoryId);
            return (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                {done ? (
                  <CheckCircle2 size={16} color="#4CAF50" />
                ) : (
                  <Circle size={16} color="#ddd" />
                )}
                <span style={{ fontSize: 13 }}>
                  {cat.emoji} {h.name}
                </span>
              </div>
            );
          })}
        </>
      )}
      {tasks.length > 0 && (
        <>
          <p style={{ ...styles.label, marginTop: 12 }}>오늘 할 일</p>
          {tasks.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              {t.done ? (
                <CheckCircle2 size={16} color="#ff6b6b" />
              ) : (
                <Circle size={16} color="#ddd" />
              )}
              <span
                style={{
                  fontSize: 13,
                  textDecoration: t.done ? "line-through" : "none",
                  color: t.done ? "#aaa" : "#333",
                }}
              >
                {t.text}
              </span>
            </div>
          ))}
        </>
      )}
      {activeHabits.length === 0 && tasks.length === 0 && (
        <p style={{ color: "#bbb", fontSize: 13 }}>기록이 없습니다</p>
      )}
    </div>
  );
}

function ArchiveTab({
  archive,
  archiveMonth_,
  today,
  archiveMonth,
  setArchiveMonth,
  categories,
}) {
  const currentMonthKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
  const sortedMonths = Object.keys(archive).sort().reverse();

  if (archiveMonth) {
    const data = archive[archiveMonth];
    return (
      <div style={styles.tabContent}>
        <button style={styles.backBtn} onClick={() => setArchiveMonth(null)}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <h2 style={styles.archiveTitle}>{archiveMonth} 습관 기록</h2>
        {categories.map((cat) => {
          const catHabits = (data.habits || []).filter(
            (h) => h.categoryId === cat.id
          );
          if (catHabits.length === 0) return null;
          return (
            <div key={cat.id} style={styles.archiveCatSection}>
              <p style={styles.archiveCatTitle}>
                {cat.emoji} {cat.name}
              </p>
              {catHabits.map((h) => (
                <div key={h.id} style={styles.archiveHabitItem}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#222" }}>
                    {h.name}
                  </p>
                  <p style={{ fontSize: 11, color: "#aaa" }}>
                    {h.days?.map((d) => DAYS_KR[d]).join(" ")}
                  </p>
                </div>
              ))}
            </div>
          );
        })}
        {(!data.habits || data.habits.length === 0) && (
          <p style={{ color: "#bbb", textAlign: "center", marginTop: 40 }}>
            저장된 습관이 없습니다
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.archiveTitle}>습관 저장소</h2>
      <p style={{ color: "#aaa", fontSize: 13, marginBottom: 20 }}>
        매달 습관을 저장하고 돌아볼 수 있어요
      </p>
      <button
        style={styles.archiveNowBtn}
        onClick={() => archiveMonth_(currentMonthKey)}
      >
        <Archive size={16} />
        이번 달 ({currentMonthKey}) 습관 저장하기
      </button>
      {sortedMonths.length === 0 ? (
        <div style={styles.emptyState}>
          <p>아직 저장된 기록이 없어요</p>
          <p style={{ fontSize: 12, color: "#bbb" }}>
            위 버튼으로 이번 달 습관을 저장해보세요
          </p>
        </div>
      ) : (
        sortedMonths.map((monthKey) => {
          const data = archive[monthKey];
          const habitCount = data.habits?.length || 0;
          return (
            <button
              key={monthKey}
              style={styles.archiveCard}
              onClick={() => setArchiveMonth(monthKey)}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: "#222" }}>
                  {monthKey}
                </p>
                <p style={{ fontSize: 12, color: "#aaa" }}>
                  습관 {habitCount}개 기록됨
                </p>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(data.categories || categories).slice(0, 4).map((cat) => (
                  <span key={cat.id} style={{ fontSize: 18 }}>
                    {cat.emoji}
                  </span>
                ))}
              </div>
              <ChevronRight size={18} color="#ccc" />
            </button>
          );
        })
      )}
    </div>
  );
}

function BottomTab({ tab, setTab }) {
  const tabs = [
    { id: "checklist", icon: <ListChecks size={22} />, label: "체크리스트" },
    { id: "today", icon: <Star size={22} />, label: "오늘 할 일" },
    { id: "stats", icon: <BarChart2 size={22} />, label: "통계" },
    { id: "archive", icon: <Archive size={22} />, label: "저장소" },
  ];
  return (
    <div style={styles.bottomTab}>
      {tabs.map((t) => (
        <button
          key={t.id}
          style={{ ...styles.tabBtn, color: tab === t.id ? "#222" : "#bbb" }}
          onClick={() => setTab(t.id)}
        >
          <div style={{ color: tab === t.id ? "#222" : "#ccc" }}>{t.icon}</div>
          <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400 }}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

const styles = {
  app: {
    maxWidth: 430,
    margin: "0 auto",
    minHeight: "100vh",
    background: "#fff",
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#fff",
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    border: "3px solid #f0f0f0",
    borderTop: "3px solid #222",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  weekHeader: {
    background: "#fff",
    borderBottom: "1px solid #f0f0f0",
    padding: "12px 16px 8px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  weekHeaderTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  weekNavBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
  },
  monthLabel: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  weekDays: { display: "flex", justifyContent: "space-around" },
  weekDayCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 500,
  },
  todayDot: { width: 4, height: 4, borderRadius: "50%", background: "#222" },
  miniCalWrap: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    position: "absolute",
    top: "100%",
    left: 16,
    right: 16,
    zIndex: 200,
  },
  miniCalHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  miniCalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 2,
  },
  miniCalDayLabel: {
    textAlign: "center",
    fontSize: 10,
    color: "#aaa",
    padding: "4px 0",
    fontWeight: 600,
  },
  miniCalDay: {
    width: "100%",
    aspectRatio: "1",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  tabContent: { padding: "16px 16px 0" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  habitCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderRadius: 16,
    padding: "14px 16px",
    marginBottom: 8,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #f5f5f5",
  },
  habitInfo: { display: "flex", alignItems: "center", gap: 10, flex: 1 },
  habitName: { fontSize: 15, fontWeight: 600, margin: 0 },
  habitMeta: { fontSize: 11, color: "#aaa", margin: 0 },
  checkBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  editBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#bbb",
    fontSize: 14,
  },
  fab: {
    position: "fixed",
    bottom: 90,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#222",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    zIndex: 50,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 300,
  },
  modal: {
    background: "#fff",
    borderRadius: "24px 24px 0 0",
    padding: 24,
    width: "100%",
    maxWidth: 430,
    maxHeight: "85vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#222", margin: 0 },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    display: "block",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1.5px solid #eee",
    fontSize: 15,
    color: "#222",
    marginBottom: 16,
    boxSizing: "border-box",
    outline: "none",
    background: "#fafafa",
  },
  selectInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1.5px solid #eee",
    fontSize: 14,
    color: "#222",
    background: "#fafafa",
    outline: "none",
    cursor: "pointer",
  },
  monthHint: {
    fontSize: 12,
    color: "#4CAF50",
    background: "#f0faf0",
    padding: "8px 12px",
    borderRadius: 10,
    marginBottom: 4,
    fontWeight: 600,
  },
  catGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catChip: {
    padding: "6px 12px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  dayGrid: { display: "flex", gap: 6, marginBottom: 16 },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  saveBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 14,
    background: "#222",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteBtn: {
    padding: "14px 20px",
    borderRadius: 14,
    background: "#fff0f0",
    color: "#ff4444",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  todayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  todayTitle: { fontSize: 22, fontWeight: 800, color: "#222", margin: 0 },
  todaySubtitle: { fontSize: 13, color: "#aaa", margin: "4px 0 0" },
  todayProgress: { display: "flex", alignItems: "baseline", gap: 2 },
  progressBarWrap: {
    height: 6,
    background: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "#222",
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  taskCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#fff",
    borderRadius: 16,
    padding: "16px",
    marginBottom: 10,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #f5f5f5",
  },
  addTaskBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: 16,
    border: "2px dashed #e0e0e0",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  quoteCard: {
    background: "#fafafa",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    textAlign: "center",
  },
  quoteText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.6,
    margin: "0 0 8px",
    fontStyle: "italic",
  },
  quoteAuthor: { fontSize: 12, color: "#aaa", margin: 0 },
  statCalNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 3,
    marginBottom: 16,
  },
  statCalDay: {
    aspectRatio: "1",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#888",
  },
  legendDot: { width: 8, height: 8, borderRadius: "50%" },
  detailCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    marginBottom: 16,
    border: "1px solid #f0f0f0",
  },
  monthlyRateCard: {
    background: "#fafafa",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  monthlyRateBar: {
    height: 8,
    background: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  monthlyRateFill: {
    height: "100%",
    background: "#4CAF50",
    borderRadius: 4,
    transition: "width 0.5s ease",
  },
  weekStatCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    border: "1px solid #f5f5f5",
  },
  weekStatTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#888",
    marginBottom: 12,
  },
  pieRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  pieItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  taskStatGrid: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 24 },
  taskStatDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  archiveTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#222",
    marginBottom: 4,
  },
  archiveNowBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 14,
    background: "#f5f5f5",
    color: "#333",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  archiveCard: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderRadius: 16,
    padding: "16px",
    marginBottom: 10,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #f5f5f5",
    cursor: "pointer",
    textAlign: "left",
  },
  archiveCatSection: { marginBottom: 20 },
  archiveCatTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#333",
    marginBottom: 8,
  },
  archiveHabitItem: {
    background: "#fafafa",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 6,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    fontSize: 14,
    marginBottom: 16,
    padding: 0,
  },
  bottomTab: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    background: "#fff",
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-around",
    padding: "8px 0 16px",
    zIndex: 100,
  },
  tabBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 12px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
};

const styleEl = document.createElement("style");
styleEl.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f8f8f8; }
  button { font-family: inherit; }
  input { font-family: inherit; }
  select { font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
`;
document.head.appendChild(styleEl);
