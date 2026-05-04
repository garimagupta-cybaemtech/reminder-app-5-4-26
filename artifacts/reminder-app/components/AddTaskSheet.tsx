import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Calendar } from "react-native-calendars";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SimpleTimePicker } from "@/components/SimpleTimePicker";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { useSettings } from "@/context/SettingsContext";
import { CATEGORY_COLORS, useTasks } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";
import { TONES } from "@/services/sounds";
import { useVoiceRecorder } from "@/services/voice";
import {
  CATEGORIES,
  type Category,
  type Recurring,
  type ReminderPreset,
  type Task,
} from "@/types";
import {
  formatDisplayDate,
  formatHM,
  presetToDate,
  todayYMD,
} from "@/utils/dates";

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultDate: string;
  taskToEdit?: Task | null;
}

const REMINDERS: ReminderPreset[] = ["Today", "Tomorrow", "Day after tomorrow", "Custom"];
const RECURRING: Recurring[] = ["None", "Daily", "Weekly"];

export function AddTaskSheet({ visible, onClose, defaultDate, taskToEdit }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { addTask, updateTask } = useTasks();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { organizationMembers } = useOrganization();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => Math.round(new Date().getMinutes() / 5) * 5);
  const [category, setCategory] = useState<Category>("Meeting");
  const [reminder, setReminder] = useState<ReminderPreset>("Today");
  const [location, setLocation] = useState("");
  const [alarm, setAlarm] = useState(true);
  const [snoozeMinutes, setSnoozeMinutes] = useState(10);
  const [recurring, setRecurring] = useState<Recurring>("None");
  const [voiceNote, setVoiceNote] = useState<string | undefined>();
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const voice = useVoiceRecorder();

  useEffect(() => {
    if (visible) {
      if (taskToEdit) {
        const [h, m] = taskToEdit.time.split(":").map((v) => Number(v));
        setTitle(taskToEdit.title);
        setNotes(taskToEdit.notes ?? "");
        setDate(taskToEdit.date);
        setHour(Number.isFinite(h) ? h : 9);
        setMinute(Number.isFinite(m) ? m : 0);
        setCategory(taskToEdit.category);
        setReminder("Custom");
        setLocation(taskToEdit.location ?? "");
        setAlarm(taskToEdit.alarm);
        setSnoozeMinutes(taskToEdit.snoozeMinutes ?? 10);
        setRecurring(taskToEdit.recurring);
        setVoiceNote(taskToEdit.voiceNote);
        setShowCustomDate(true);
        setSelectedMemberIds(taskToEdit.participantUserIds ?? (user ? [user.id] : []));
      } else {
        setTitle("");
        setNotes("");
        setDate(defaultDate);
        setHour(new Date().getHours());
        setMinute(Math.round(new Date().getMinutes() / 5) * 5 % 60);
        setCategory("Meeting");
        setReminder("Today");
        setLocation("");
        setAlarm(true);
        setSnoozeMinutes(10);
        setRecurring("None");
        setVoiceNote(undefined);
        setShowCustomDate(false);
        setSelectedMemberIds(user ? [user.id] : []);
      }
      voice.reset();
      const today = todayYMD();
      if (!taskToEdit) {
        if (defaultDate === today) setReminder("Today");
        else if (defaultDate > today) setReminder("Custom");
      }
    }
  }, [visible, defaultDate, taskToEdit, user?.id]);

  const time = useMemo(
    () =>
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    [hour, minute],
  );

  function applyReminder(r: ReminderPreset) {
    setReminder(r);
    if (r === "Custom") {
      setShowCustomDate(true);
    } else {
      setDate(presetToDate(r));
      setShowCustomDate(false);
    }
  }

  async function handleVoiceToggle() {
    if (voice.isRecording) {
      const uri = await voice.stop();
      if (uri) setVoiceNote(uri);
    } else {
      await voice.start();
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Add a title", "Please enter a title for your task.");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (taskToEdit) {
      await updateTask(taskToEdit.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        date,
        time,
        category,
        voiceNote,
        location: location.trim() || undefined,
        reminder,
        alarm,
        alarmTone: alarm ? settings.alarmTone : undefined,
        snoozeMinutes,
        recurring,
        participantUserIds: Array.from(new Set(selectedMemberIds)),
        completed: false,
        cancelled: false,
      });
    } else {
      await addTask({
        title: title.trim(),
        notes: notes.trim() || undefined,
        date,
        time,
        category,
        voiceNote,
        location: location.trim() || undefined,
        reminder,
        alarm,
        alarmTone: alarm ? settings.alarmTone : undefined,
        snoozeMinutes,
        recurring,
        memberUserIds: Array.from(new Set(selectedMemberIds)),
      });
    }
    onClose();
  }

  const selectedTone = TONES.find((t) => t.id === settings.alarmTone);

  const accent = CATEGORY_COLORS[category];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: c.border }]} />
          </View>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.headerBtn, { color: c.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: c.foreground }]}>
              {taskToEdit ? "Edit Task" : "New Task"}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.headerBtn, { color: c.primary, fontWeight: "700" }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleRow}>
              <View style={[styles.categoryDot, { backgroundColor: accent }]} />
              <TextInput
                placeholder="What do you want to remember?"
                placeholderTextColor={c.mutedForeground}
                value={title}
                onChangeText={setTitle}
                style={[styles.titleInput, { color: c.foreground }]}
                autoFocus
                multiline
              />
              <TouchableOpacity
                onPress={handleVoiceToggle}
                style={[
                  styles.voiceBtn,
                  {
                    backgroundColor: voice.isRecording ? c.destructive : c.surface,
                    borderColor: voice.isRecording ? c.destructive : c.border,
                  },
                ]}
              >
                <Ionicons
                  name={voice.isRecording ? "stop" : "mic"}
                  size={18}
                  color={voice.isRecording ? "#fff" : c.foreground}
                />
              </TouchableOpacity>
            </View>

            {voice.isRecording ? (
              <View style={styles.voiceRow}>
                <View style={[styles.recordingDot, { backgroundColor: c.destructive }]} />
                <Text style={[styles.voiceText, { color: c.destructive }]}>
                  Recording... {voice.durationSec}s
                </Text>
              </View>
            ) : voiceNote ? (
              <View style={styles.voiceRow}>
                <Ionicons name="checkmark-circle" size={16} color={c.success} />
                <Text style={[styles.voiceText, { color: c.mutedForeground }]}>
                  Voice note saved
                </Text>
                <TouchableOpacity onPress={() => setVoiceNote(undefined)}>
                  <Feather name="x" size={14} color={c.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : voice.error ? (
              <Text style={[styles.errorText, { color: c.destructive }]}>
                {voice.error}
              </Text>
            ) : null}

            <SectionLabel text="Category" />
            <SectionLabel text="Notes" />
            <View
              style={[
                styles.notesInputWrap,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add details or notes (optional)"
                placeholderTextColor={c.mutedForeground}
                style={[styles.notesInput, { color: c.foreground }]}
                multiline
              />
            </View>

            <SectionLabel text="Category" />
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const isActive = cat === category;
                const color = CATEGORY_COLORS[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: isActive ? `${color}20` : c.surface,
                        borderColor: isActive ? color : c.border,
                      },
                    ]}
                  >
                    <View style={[styles.catDot, { backgroundColor: color }]} />
                    <Text
                      style={[
                        styles.catText,
                        { color: isActive ? color : c.foreground },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SectionLabel text="When" />
            <View style={styles.reminderRow}>
              {REMINDERS.map((r) => {
                const isActive = r === reminder;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => applyReminder(r)}
                    style={[
                      styles.reminderChip,
                      {
                        backgroundColor: isActive ? c.primary : c.surface,
                        borderColor: isActive ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderText,
                        { color: isActive ? c.primaryForeground : c.foreground },
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                styles.dateBox,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Feather name="calendar" size={16} color={c.primary} />
              <Text style={[styles.dateText, { color: c.foreground }]}>
                {formatDisplayDate(date)}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomDate((s) => !s)}>
                <Text style={[styles.changeBtn, { color: c.primary }]}>
                  {showCustomDate ? "Done" : "Change"}
                </Text>
              </TouchableOpacity>
            </View>

            {showCustomDate ? (
              <View style={[styles.calendarBox, { borderColor: c.border }]}>
                <Calendar
                  current={date}
                  onDayPress={(d: { dateString: string }) => {
                    setDate(d.dateString);
                    setReminder("Custom");
                  }}
                  markedDates={{
                    [date]: { selected: true, selectedColor: c.primary },
                  }}
                  theme={{
                    backgroundColor: c.background,
                    calendarBackground: c.background,
                    textSectionTitleColor: c.mutedForeground,
                    selectedDayTextColor: "#fff",
                    todayTextColor: c.primary,
                    dayTextColor: c.foreground,
                    monthTextColor: c.foreground,
                    arrowColor: c.primary,
                  }}
                />
              </View>
            ) : null}

            <SectionLabel text="Time" />
            <SimpleTimePicker
              hour={hour}
              minute={minute}
              onChange={(h, m) => {
                setHour(h);
                setMinute(m);
              }}
            />

            <SectionLabel text="Visit Location" />
            <View
              style={[
                styles.input,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Feather name="map-pin" size={16} color={c.mutedForeground} />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Add a location (optional)"
                placeholderTextColor={c.mutedForeground}
                style={[styles.inputText, { color: c.foreground }]}
              />
            </View>

            <SectionLabel text="Repeat" />
            <View style={styles.reminderRow}>
              {RECURRING.map((r) => {
                const isActive = r === recurring;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRecurring(r)}
                    style={[
                      styles.reminderChip,
                      {
                        backgroundColor: isActive ? c.primary : c.surface,
                        borderColor: isActive ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderText,
                        { color: isActive ? c.primaryForeground : c.foreground },
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Pressable
              onPress={() => setAlarm((a) => !a)}
              style={[
                styles.toggleRow,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="alarm"
                  size={20}
                  color={alarm ? c.primary : c.mutedForeground}
                />
                <View>
                  <Text style={[styles.toggleTitle, { color: c.foreground }]}>
                    Alarm
                  </Text>
                  <Text style={[styles.toggleSub, { color: c.mutedForeground }]}>
                    {alarm && selectedTone
                      ? `Tone: ${selectedTone.emoji} ${selectedTone.name}`
                      : "Notify me at task time"}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.switch,
                  {
                    backgroundColor: alarm ? c.primary : c.input,
                  },
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    {
                      backgroundColor: "#fff",
                      transform: [{ translateX: alarm ? 18 : 2 }],
                    },
                  ]}
                />
              </View>
            </Pressable>

            {alarm ? (
              <Text style={[styles.toneHint, { color: c.mutedForeground }]}>
                Change the alarm tone in Settings.
              </Text>
            ) : null}

            <SectionLabel text="Snooze duration" />
            <View style={styles.reminderRow}>
              {[
                { value: 5, label: "5 min" },
                { value: 10, label: "10 min" },
                { value: 15, label: "15 min" },
                { value: 20, label: "20 min" },
                { value: 1440, label: "1 Day" },
              ].map(({ value, label }) => {
                const isActive = snoozeMinutes === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setSnoozeMinutes(value)}
                    style={[
                      styles.reminderChip,
                      {
                        backgroundColor: isActive ? c.primary : c.surface,
                        borderColor: isActive ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderText,
                        { color: isActive ? c.primaryForeground : c.foreground },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {organizationMembers.length ? (
              <>
                <SectionLabel text="Share with members" />
                <View style={styles.categoryRow}>
                  {organizationMembers.map(({ user: member }) => {
                    const selected = selectedMemberIds.includes(member.id);
                    const isSelf = member.id === user?.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => {
                          if (isSelf) return;
                          setSelectedMemberIds((prev) =>
                            prev.includes(member.id)
                              ? prev.filter((id) => id !== member.id)
                              : [...prev, member.id],
                          );
                        }}
                        style={[
                          styles.memberChip,
                          {
                            backgroundColor: selected ? `${member.color}20` : c.surface,
                            borderColor: selected ? member.color : c.border,
                            opacity: isSelf ? 0.8 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
                          <Text style={styles.memberAvatarText}>
                            {member.name
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")}
                          </Text>
                        </View>
                        <Text style={[styles.catText, { color: c.foreground }]}>
                          {isSelf ? `${member.name} (You)` : member.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SectionLabel({ text }: { text: string }) {
  const c = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  handle: {
    alignItems: "center",
    paddingTop: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerBtn: {
    fontSize: 15,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  titleInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    paddingVertical: 4,
    minHeight: 36,
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voiceText: {
    fontSize: 13,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catText: {
    fontSize: 13,
    fontWeight: "600",
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  reminderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  reminderText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  changeBtn: {
    fontSize: 13,
    fontWeight: "600",
  },
  calendarBox: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
  },
  notesInputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  notesInput: {
    minHeight: 72,
    fontSize: 14,
    textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  toggleSub: {
    fontSize: 12,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  toneHint: {
    fontSize: 11,
    paddingHorizontal: 4,
    marginTop: -4,
  },
});
