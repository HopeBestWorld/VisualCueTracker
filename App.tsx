import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, SafeAreaView, ScrollView, Modal, KeyboardAvoidingView, Platform, Alert,
  Clipboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const SYMBOLS_CONFIG = [
  {
    emoji: '❤️',
    label: 'Empathy',
    details: 'Made a choice based on empathy',
    // Added synonyms: assist, support, comfort, empathy
    keywords: ['help', 'care', 'listen', 'connect', 'friend', 'family', 'other', 'support', 'kind', 'empath', 'assist', 'comfort'],
    suggestions: 'Try adding details about who you helped or how you connected with others.'
  },
  {
    emoji: '🌱',
    label: 'Growth',
    details: 'Did something that helps me grow',
    // Added synonyms: develop, progress, advance
    keywords: ['learn', 'challenge', 'study', 'code', 'build', 'practice', 'win', 'lesson', 'hard', 'improve', 'grow', 'intern', 'develop', 'progress', 'advance'],
    suggestions: 'Try mentioning a specific technical challenge, lesson learned, or growth milestone.'
  },
  {
    emoji: '⚖️',
    label: 'Balance',
    details: 'Protected my personal balance',
    // Added synonyms: recover, boundary, calm
    keywords: ['rest', 'sleep', 'boundar', 'relax', 'walk', 'break', 'stop', 'breathe', 'exercise', 'health', 'peace', 'recover', 'calm'],
    suggestions: 'Try detailing how you set a boundary, rested, or took time to recharge.'
  },
];

// Lightweight local sentiment lexicon dictionaries
const SENTIMENT_LEXICON = {
  positive: ['win', 'good', 'great', 'proud', 'happy', 'excited', 'best', 'love', 'amazing', 'smooth', 'accomplished', 'progress'],
  negative: ['hard', 'stressed', 'tired', 'exhausted', 'difficult', 'struggled', 'overwhelmed', 'stuck', 'failed', 'worry', 'anxious']
};

interface TrackerState {
  [dayIndex: number]: string[];
}

interface HistoricalEntry {
  date: string;
  weekLabel: string;
  trackerData: TrackerState;
  reflection: string;
  weekOffset?: number;
  aiInsight?: string; // Appended local AI analysis block
}

const getWeekRangeLabel = (offsetWeeks = 0) => {
  const current = new Date();
  const day = current.getDay();

  const sunday = new Date(current);
  sunday.setDate(current.getDate() - day + (offsetWeeks * 7));

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${sunday.toLocaleDateString(undefined, formatOptions)} – ${saturday.toLocaleDateString(undefined, formatOptions)}, ${saturday.getFullYear()}`;
};

export default function App() {
  const [trackerData, setTrackerData] = useState<TrackerState>({});
  const [reflection, setReflection] = useState('');
  const [history, setHistory] = useState<HistoricalEntry[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Live Local AI Engine computation state
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTracker = await AsyncStorage.getItem('@tracker_data');
        const savedReflection = await AsyncStorage.getItem('@reflection_data');
        const savedHistory = await AsyncStorage.getItem('@tracker_history');
        const savedOffset = await AsyncStorage.getItem('@week_offset');
        const savedEditingId = await AsyncStorage.getItem('@editing_entry_id');

        if (savedTracker) setTrackerData(JSON.parse(savedTracker));
        if (savedReflection) setReflection(savedReflection);
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedOffset) setWeekOffset(parseInt(savedOffset, 10));
        if (savedEditingId) setEditingEntryId(savedEditingId);
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('@tracker_data', JSON.stringify(trackerData));
        await AsyncStorage.setItem('@reflection_data', reflection);
        await AsyncStorage.setItem('@week_offset', weekOffset.toString());
        if (editingEntryId) {
          await AsyncStorage.setItem('@editing_entry_id', editingEntryId);
        } else {
          await AsyncStorage.removeItem('@editing_entry_id');
        }
      } catch (e) {
        console.error('Failed to save data', e);
      }
    };
    saveData();
  }, [trackerData, reflection, weekOffset, editingEntryId]);

  // --- UPGRADED actionable LOCAL AI + LEXICON SENTIMENT ENGINE ---
  const runLocalAIAnalysis = (text: string, activeSymbols: TrackerState): string => {
    if (!text.trim()) return "No written reflection text found to process semantic alignment metrics.";

    const textLower = text.toLowerCase();

    // 1. Sentiment Extraction Phase
    let posCount = 0;
    let negCount = 0;
    SENTIMENT_LEXICON.positive.forEach(word => { if (textLower.includes(word)) posCount++; });
    SENTIMENT_LEXICON.negative.forEach(word => { if (textLower.includes(word)) negCount++; });

    let sentimentResult = "Neutral / Reflective";
    if (posCount > negCount) sentimentResult = "Positive & Accomplished ✨";
    if (negCount > posCount) sentimentResult = "Challenging / Needs Recharge ⏳";

    // 2. Exact Key Term Extraction & Scoring Phase
    const detectedTermsByValue: { [key: string]: string[] } = {};
    const categoryScores = SYMBOLS_CONFIG.map(config => {
      const foundWords = config.keywords.filter(word => {
        // Allows the root word to be followed by up to 3 alphabetical characters
        const regex = new RegExp(`\\b${word}[a-z]{0,3}\\b`, 'gi');
        return regex.test(textLower);
      });

      detectedTermsByValue[config.label] = foundWords;
      return { emoji: config.emoji, label: config.label, score: foundWords.length, config };
    });

    const topCategory = categoryScores.reduce((max, current) => current.score > max.score ? current : max, { emoji: '', label: '', score: -1, config: SYMBOLS_CONFIG[0] });

    const flatGridSymbols = Object.values(activeSymbols).flat();
    const uniqueGridSymbols = Array.from(new Set(flatGridSymbols));

    // 3. Formulate Precise Actions & Instructions
    let outputString = `📊 WEEKLY ANALYSIS\n• Sentiment Detected: ${sentimentResult}\n\n`;

    if (topCategory.score > 0) {
      outputString += `🧠 Top focus detected: "${topCategory.label}" based on your use of terms like: [ ${detectedTermsByValue[topCategory.label].join(', ')} ].\n\n`;

      if (uniqueGridSymbols.includes(topCategory.emoji)) {
        outputString += `✅ Alignment verified: Your written thoughts correspond strongly with the ${topCategory.emoji} markers logged on your grid.`;
      } else {
        outputString += `💡 How to improve entry: You used ${topCategory.score} term(s) regarding ${topCategory.label}, but haven't marked any ${topCategory.emoji} chips on your calendar. Consider long-pressing a grid cell to map this value, or use terms from your selected values to bridge the gap!`;
      }
    } else {
      // User wrote a text block but hit zero keywords
      outputString += `🔍 How to improve entry: Your reflection didn't capture any core values vocabulary words. To build deep history metrics, try to introduce at least 1 or 2 targeted indicator terms:\n`;
      categoryScores.forEach(cat => {
        outputString += `   • For ${cat.emoji} ${cat.label}: ${cat.config.suggestions}\n`;
      });
    }

    return outputString;
  };

  // Trigger local calculations on reflection text update inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (reflection.trim()) {
        const output = runLocalAIAnalysis(reflection, trackerData);
        setAiAnalysisResult(output);
      } else {
        setAiAnalysisResult(null);
      }
    }, 600); // Debounce engine updates for responsive rendering throughput
    return () => clearTimeout(timer);
  }, [reflection, trackerData]);

  // FIXED: Explicitly typed 'symbol' argument to remove implicit any compilation error
  const toggleSymbol = (symbol: string) => {
    if (activeDay === null) return;

    setTrackerData(prev => {
      const daySymbols = prev[activeDay] || [];
      const updatedSymbols = daySymbols.includes(symbol)
        ? daySymbols.filter(s => s !== symbol)
        : [...daySymbols, symbol];

      return { ...prev, [activeDay]: updatedSymbols };
    });
  };

  const openSymbolSelector = (dayIndex: number) => {
    setActiveDay(dayIndex);
    setModalVisible(true);
  };

  const handleClearDay = (dayIndex: number) => {
    if (!trackerData[dayIndex] || trackerData[dayIndex].length === 0) return;

    const performClear = () => {
      setTrackerData(prev => {
        const updated = { ...prev };
        delete updated[dayIndex];
        return updated;
      });
    };

    const targetDayLabel = DAYS[dayIndex];
    const confirmMessage = `Clear all value symbols for ${targetDayLabel}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        performClear();
      }
    } else {
      Alert.alert(
        "Clear Day?",
        confirmMessage,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: performClear }
        ]
      );
    }
  };

  const handleSubmitWeek = async () => {
    if (Object.keys(trackerData).length === 0 && !reflection.trim()) {
      const msg = "Add some symbols or thoughts before completing your week!";
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Empty Week", msg);
      return;
    }

    const currentAiInsight = runLocalAIAnalysis(reflection, trackerData);

    try {
      let updatedHistory = [...history];

      if (editingEntryId) {
        updatedHistory = updatedHistory.map(entry => {
          if (entry.date === editingEntryId) {
            return {
              ...entry,
              trackerData,
              reflection,
              weekOffset,
              weekLabel: getWeekRangeLabel(weekOffset),
              aiInsight: currentAiInsight // Persist structural analytics data block
            };
          }
          return entry;
        });
        setEditingEntryId(null);
      } else {
        const historicalEntry: HistoricalEntry = {
          date: new Date().toISOString(),
          weekLabel: getWeekRangeLabel(weekOffset),
          trackerData,
          reflection,
          weekOffset,
          aiInsight: currentAiInsight
        };
        updatedHistory.push(historicalEntry);
      }

      setHistory(updatedHistory);
      await AsyncStorage.setItem('@tracker_history', JSON.stringify(updatedHistory));

      setTrackerData({});
      setReflection('');
      setWeekOffset(0);
      setAiAnalysisResult(null);
      await AsyncStorage.removeItem('@tracker_data');
      await AsyncStorage.removeItem('@reflection_data');
      await AsyncStorage.removeItem('@week_offset');

      const successMsg = "Your tracking entry has been successfully saved to your dashboard archive.";
      Platform.OS === 'web' ? window.alert(successMsg) : Alert.alert("Week Saved! 🎉", successMsg);
    } catch (e) {
      console.error('Failed to submit week entry', e);
    }
  };

  const handleDeleteWeek = async (targetDate: string) => {
    const performDelete = async () => {
      try {
        const updatedHistory = history.filter(entry => entry.date !== targetDate);
        setHistory(updatedHistory);
        await AsyncStorage.setItem('@tracker_history', JSON.stringify(updatedHistory));
        setExpandedIndex(null);
        if (editingEntryId === targetDate) {
          setEditingEntryId(null);
          setTrackerData({});
          setReflection('');
          setWeekOffset(0);
        }
      } catch (e) {
        console.error('Failed to delete history item', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this week? Once removed, this history cannot be recovered.")) {
        await performDelete();
      }
    } else {
      Alert.alert(
        "Delete Entry?",
        "Are you sure you want to delete this week? Once removed, this history cannot be recovered.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete Permanently", style: "destructive", onPress: performDelete }
        ]
      );
    }
  };

  const handleEditWeek = (entry: HistoricalEntry) => {
    setTrackerData(entry.trackerData);
    setReflection(entry.reflection);
    setEditingEntryId(entry.date);
    setWeekOffset(entry.weekOffset !== undefined ? entry.weekOffset : 0);
    setExpandedIndex(null);

    const feedback = "Loaded data into workspace! Check the top block to modify entries, then click 'Update Save'.";
    Platform.OS === 'web' ? window.alert(feedback) : Alert.alert("Editing Entry", feedback);
  };

  const handleCopySummary = (entry: HistoricalEntry) => {
    const uniqueSymbolsSet = new Set<string>();
    Object.values(entry.trackerData).forEach(daySymbols => {
      daySymbols.forEach(symbol => uniqueSymbolsSet.add(symbol));
    });

    const symbolsArray = Array.from(uniqueSymbolsSet);
    let valuesString = "No tracking tags logged";

    if (symbolsArray.length > 0) {
      const descriptions = symbolsArray.map(symbol => {
        const config = SYMBOLS_CONFIG.find(c => c.emoji === symbol);
        return `${symbol} ${config ? config.label : ''}`;
      });
      valuesString = descriptions.join(', ');
    }

    const displayDate = entry.weekLabel || new Date(entry.date).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const reflectionText = entry.reflection ? `"${entry.reflection}"` : 'None';
    let formattedSummary = `My Week at a Glance (${displayDate}): Focused on [ ${valuesString} ]. Reflection: ${reflectionText}`;

    if (entry.aiInsight) {
      formattedSummary += `\n🤖 AI Alignment Analytics: ${entry.aiInsight}`;
    }

    Clipboard.setString(formattedSummary);

    const confirmation = "Summary text copied to your clipboard!";
    Platform.OS === 'web' ? window.alert(confirmation) : Alert.alert("Copied!", confirmation);
  };

  const handleExportData = async () => {
    if (history.length === 0) {
      const emptyMsg = "You don't have any archived weeks to export yet.";
      Platform.OS === 'web' ? window.alert(emptyMsg) : Alert.alert("No Data", emptyMsg);
      return;
    }

    try {
      let textContent = "=========================================\n";
      textContent += "        VISUAL CUE TRACKER LOGS          \n";
      textContent += `Exported on: ${new Date().toLocaleDateString()}\n`;
      textContent += "=========================================\n\n";

      history.slice().reverse().forEach((entry) => {
        const displayDate = entry.weekLabel || new Date(entry.date).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        });

        textContent += `📅 WEEK: ${displayDate}\n`;
        textContent += `💬 REFLECTION: ${entry.reflection ? `"${entry.reflection}"` : "None"}\n`;
        if (entry.aiInsight) {
          textContent += `🤖 LOCAL AI METRICS: ${entry.aiInsight}\n`;
        }
        textContent += "📊 DAILY CUES:\n";

        DAYS.forEach((day, dIdx) => {
          const daySymbols = entry.trackerData[dIdx] || [];
          const symbolsString = daySymbols.length > 0 ? daySymbols.join(' ') : '•';
          textContent += `   ${day}: ${symbolsString}\n`;
        });

        textContent += "\n-----------------------------------------\n\n";
      });

      const filename = `visual-cue-tracker-log-${new Date().toISOString().split('T')[0]}.txt`;

      if (Platform.OS === 'web') {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        Clipboard.setString(textContent);
        Alert.alert(
          "Logs Exported! 📄",
          "Your complete tracking journal has been formatted as plain text and copied to your clipboard. You can paste it safely into your Notes app or any file document tool."
        );
      }
    } catch (e) {
      console.error('Failed to export tracking statistics database', e);
    }
  };

  const cancelEditing = () => {
    setTrackerData({});
    setReflection('');
    setEditingEntryId(null);
    setWeekOffset(0);
    setAiAnalysisResult(null);
  };

  const calculateStats = () => {
    const counts: { [key: string]: number } = { '❤️': 0, '🌱': 0, '⚖️': 0 };
    let total = 0;

    history.forEach(entry => {
      if (entry.date === editingEntryId) return;

      Object.values(entry.trackerData).forEach(daySymbols => {
        daySymbols.forEach(symbol => {
          if (counts[symbol] !== undefined) {
            counts[symbol]++;
            total++;
          }
        });
      });
    });

    Object.values(trackerData).forEach(daySymbols => {
      daySymbols.forEach(symbol => {
        if (counts[symbol] !== undefined) {
          counts[symbol]++;
          total++;
        }
      });
    });

    return { counts, total };
  };

  const { counts, total } = calculateStats();

  const getWeekSubtext = () => {
    if (weekOffset === 0) return "Current Week";
    if (weekOffset === -1) return "Last Week";
    if (weekOffset === 1) return "Next Week";
    if (weekOffset < -1) return `${Math.abs(weekOffset)} Weeks Ago`;
    return `${weekOffset} Weeks Ahead`;
  };

  // FIXED: Added missing 'getDynamicPlaceholder' definition to drive context-aware motivation advice hook
  const getDynamicPlaceholder = () => {
    const activeCounts = { '❤️': 0, '🌱': 0, '⚖️': 0 };
    Object.values(trackerData).forEach(daySymbols => {
      daySymbols.forEach(symbol => {
        if (activeCounts[symbol as keyof typeof activeCounts] !== undefined) {
          activeCounts[symbol as keyof typeof activeCounts]++;
        }
      });
    });

    const maxSymbol = Object.keys(activeCounts).reduce((a, b) =>
      activeCounts[a as keyof typeof activeCounts] > activeCounts[b as keyof typeof activeCounts] ? a : b
    );

    if (activeCounts[maxSymbol as keyof typeof activeCounts] === 0) {
      return "What values guided your choices this week? Write a few thoughts...";
    }

    switch (maxSymbol) {
      case '❤️': return "You practiced deep empathy this week. How did connecting with others affect your energy?";
      case '🌱': return "Growth was a massive theme over the last few days! What was your hardest lesson or biggest win?";
      case '⚖️': return "You spent deliberate energy protecting your inner balance. What boundaries felt best to hold?";
      default: return "Write a few thoughts...";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <Text style={styles.headerTitle}>Visual Cue Tracker</Text>

          {editingEntryId && (
            <View style={styles.editingAlertBadge}>
              <Text style={styles.editingAlertText}>✏️ You are currently editing a past logged entry</Text>
              <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEditing}>
                <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.weekSelectorContainer}>
            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => setWeekOffset(prev => prev - 1)}
            >
              <Text style={styles.weekNavText}>◀</Text>
            </TouchableOpacity>

            <View style={styles.weekLabelBlock}>
              <Text style={styles.weekRangeText}>{getWeekRangeLabel(weekOffset)}</Text>
              <Text style={styles.weekSubtext}>{getWeekSubtext()}</Text>
            </View>

            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => setWeekOffset(prev => prev + 1)}
            >
              <Text style={styles.weekNavText}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridContainer}>
            {DAYS.map((day, index) => (
              <View key={index} style={styles.dayColumn}>
                <Text style={styles.dayLabel}>{day}</Text>
                <TouchableOpacity
                  style={styles.dayTile}
                  onPress={() => openSymbolSelector(index)}
                  onLongPress={() => handleClearDay(index)}
                  delayLongPress={500}
                >
                  <Text style={styles.tileSymbols}>
                    {(trackerData[index] || []).join('\n')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openSymbolSelector(new Date().getDay())}
          >
            <Text style={styles.addButtonText}>+ Add Symbol</Text>
          </TouchableOpacity>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Reflect</Text>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder={getDynamicPlaceholder()}
              placeholderTextColor="#999"
              value={reflection}
              onChangeText={setReflection}
            />

            {/* --- LIVE AI PROCESSING VIEW BADGE --- */}
            {aiAnalysisResult && (
              <View style={styles.aiResultContainer}>
                <Text style={styles.aiResultText}>{aiAnalysisResult}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, editingEntryId && styles.updateSubmitButton]}
            onPress={handleSubmitWeek}
          >
            <Text style={styles.submitButtonText}>
              {editingEntryId ? "Update Saved Week" : "Complete Week"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Insights Dashboard</Text>
              <TouchableOpacity
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#EAEAEA' }}
                onPress={handleExportData}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>📥 Export Journal</Text>
              </TouchableOpacity>
            </View>
            {total === 0 ? (
              <Text style={styles.emptyText}>Start logging values to populate your metrics.</Text>
            ) : (
              <View style={styles.chartContainer}>
                {SYMBOLS_CONFIG.map(item => {
                  const count = counts[item.emoji];
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <View key={item.emoji} style={styles.chartRow}>
                      <Text style={styles.chartSymbol}>{item.emoji}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${percentage}%` }]} />
                      </View>
                      <Text style={styles.chartValue}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Past Weeks</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No archived entries yet.</Text>
            ) : (
              history.slice().reverse().map((entry, index) => {
                const actualIndex = history.length - 1 - index;
                const isExpanded = expandedIndex === actualIndex;

                const displayDate = entry.weekLabel || new Date(entry.date).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric'
                });

                return (
                  <View key={entry.date} style={styles.historyCard}>
                    <TouchableOpacity
                      style={styles.historyHeader}
                      onPress={() => setExpandedIndex(isExpanded ? null : actualIndex)}
                    >
                      <Text style={styles.historyDate}>
                        {displayDate} {editingEntryId === entry.date && " (Editing)"}
                      </Text>
                      <Text style={styles.historyArrow}>{isExpanded ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.historyDetails}>
                        <View style={styles.historyInlineTracker}>
                          {DAYS.map((day, dIdx) => (
                            <View key={dIdx} style={styles.historyMiniColumn}>
                              <Text style={styles.historyMiniDay}>{day}</Text>
                              <Text style={styles.historyMiniSymbol}>
                                {(entry.trackerData[dIdx] || []).join('') || '•'}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {entry.reflection && (
                          <Text style={styles.historyReflectionText}>
                            "{entry.reflection}"
                          </Text>
                        )}

                        {/* --- RENDER HISTORICAL PERSISTED AI ANALYSIS --- */}
                        {entry.aiInsight && (
                          <View style={styles.historyAiBadge}>
                            <Text style={styles.historyAiBadgeText}>🤖 {entry.aiInsight}</Text>
                          </View>
                        )}

                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.actionButtonCopy}
                            onPress={() => handleCopySummary(entry)}
                          >
                            <Text style={styles.actionTextCopy}>Copy Summary</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionButtonEdit}
                            onPress={() => handleEditWeek(entry)}
                          >
                            <Text style={styles.actionTextEdit}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButtonDelete}
                            onPress={() => handleDeleteWeek(entry.date)}
                          >
                            <Text style={styles.actionTextDelete}>Delete</Text>
                          </TouchableOpacity>
                        </View>

                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select Values for {activeDay !== null ? DAYS[activeDay] : ''}
            </Text>

            <View style={styles.modalSymbolList}>
              {SYMBOLS_CONFIG.map(item => {
                const isSelected = activeDay !== null && (trackerData[activeDay] || []).includes(item.emoji);
                return (
                  <TouchableOpacity
                    key={item.emoji}
                    style={[styles.symbolRowOption, isSelected && styles.symbolRowOptionSelected]}
                    onPress={() => toggleSymbol(item.emoji)}
                  >
                    <View style={styles.symbolIconBadge}>
                      <Text style={styles.symbolOptionText}>{item.emoji}</Text>
                    </View>
                    <View style={styles.symbolDescriptionBlock}>
                      <Text style={styles.symbolLabelText}>{item.label}</Text>
                      <Text style={styles.symbolDetailText}>{item.details}</Text>
                    </View>
                    <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleChecked]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 24,
    textAlign: 'center',
  },
  editingAlertBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editingAlertText: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  cancelEditButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelEditButtonText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  weekSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
  },
  weekNavButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  weekNavText: {
    fontSize: 16,
    color: '#111',
    fontWeight: 'bold',
  },
  weekLabelBlock: {
    alignItems: 'center',
  },
  weekRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  weekSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  dayTile: {
    width: 44,
    height: 80,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    alignItems: 'center',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tileSymbols: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiResultContainer: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiResultText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 24,
  },
  updateSubmitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
  },
  chartContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 20,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  chartSymbol: {
    fontSize: 22,
    width: 36,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#111',
    borderRadius: 6,
  },
  chartValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 24,
    textAlign: 'right',
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  historyArrow: {
    fontSize: 14,
    color: '#666',
  },
  historyDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#F5F5F5',
    backgroundColor: '#FAFAFA',
  },
  historyInlineTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  historyMiniColumn: {
    alignItems: 'center',
    flex: 1,
  },
  historyMiniDay: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  historyMiniSymbol: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  historyReflectionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  historyAiBadge: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historyAiBadgeText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#EAEAEA',
    paddingTop: 12,
  },
  actionButtonCopy: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    marginRight: 'auto',
  },
  actionTextCopy: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonEdit: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  actionTextEdit: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonDelete: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  actionTextDelete: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSymbolList: {
    marginBottom: 24,
  },
  symbolRowOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
  },
  symbolRowOptionSelected: {
    borderColor: '#111',
    backgroundColor: '#F9F9F9',
  },
  symbolIconBadge: {
    backgroundColor: '#FFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  symbolOptionText: {
    fontSize: 24,
  },
  symbolDescriptionBlock: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  symbolLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  symbolDetailText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});