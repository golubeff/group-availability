"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantHeader } from "@/components/participant-header";
import { FridayGrid } from "@/components/friday-grid";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { RetreatProposals } from "@/components/retreat-proposals";
import { CombinedCalendar } from "@/components/combined-calendar";
import { IcalSettings } from "@/components/ical-settings";
import { EventStatus } from "@/components/event-status";
import { MonthlyStatus } from "@/components/monthly-status";
import {
  getRetreatDateRange,
  getAllDatesInRange,
  getMonthKey,
  formatDateRange,
} from "@/lib/dates";
import type { Participant, Vote, RetreatType, RetreatProposal } from "@/lib/types";

export default function DashboardPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const tracked = useCallback(async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { console.error("Save failed", e); }
  }, []);
  const [monthlyVotes, setMonthlyVotes] = useState<any[]>([]);
  const [miniAvailability, setMiniAvailability] = useState<any[]>([]);
  const [fullAvailability, setFullAvailability] = useState<any[]>([]);
  const [miniProposals, setMiniProposals] = useState<RetreatProposal[]>([]);
  const [fullProposals, setFullProposals] = useState<RetreatProposal[]>([]);
  const [miniVotes, setMiniVotes] = useState<any[]>([]);
  const [fullVotes, setFullVotes] = useState<any[]>([]);
  const [icalEvents, setIcalEvents] = useState<any[]>([]);
  const [showIcal, setShowIcal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("participant");
    if (!stored) {
      window.location.href = "/";
      return;
    }
    const p = JSON.parse(stored);
    setParticipant(p);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, mvRes, miniARes, fullARes, miniRRes, fullRRes] = await Promise.all([
        fetch("/api/participants"),
        fetch("/api/monthly"),
        fetch("/api/availability?type=mini"),
        fetch("/api/availability?type=full"),
        fetch("/api/retreat?type=mini"),
        fetch("/api/retreat?type=full"),
      ]);

      const participantsData = await pRes.json();
      setParticipants(participantsData);
      setMonthlyVotes(await mvRes.json());
      setMiniAvailability(await miniARes.json());
      setFullAvailability(await fullARes.json());

      const miniData = await miniRRes.json();
      setMiniProposals(miniData.proposals || []);
      setMiniVotes(miniData.votes || []);

      const fullData = await fullRRes.json();
      setFullProposals(fullData.proposals || []);
      setFullVotes(fullData.votes || []);

      // Refresh participant data (for icalLastSynced)
      const stored = localStorage.getItem("participant");
      if (stored) {
        const current = JSON.parse(stored);
        const fresh = participantsData.find((p: Participant) => p.id === current.id);
        if (fresh) {
          setParticipant(fresh);
          localStorage.setItem("participant", JSON.stringify(fresh));
        }
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIcalEvents = useCallback(async () => {
    if (!participant) return;
    try {
      const res = await fetch(`/api/ical?participantId=${participant.id}`);
      setIcalEvents(await res.json());
    } catch {
      // ignore
    }
  }, [participant]);

  useEffect(() => {
    if (participant) {
      fetchAll();
      fetchIcalEvents();
    }
  }, [participant, fetchAll, fetchIcalEvents]);

  const handleMonthlyVote = async (fridayDate: string, vote: Vote | null) => {
    if (!participant) return;
    tracked(async () => {
      if (vote === null) {
        const existing = monthlyVotes.find(
          (v: any) => v.participantId === participant.id && v.fridayDate === fridayDate
        );
        if (existing) {
          await fetch("/api/monthly", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              participantId: participant.id,
              fridayDate,
              vote: existing.vote,
            }),
          });
        }
      } else {
        await fetch("/api/monthly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: participant.id, fridayDate, vote }),
        });
      }
      await fetchAll();
    });
  };

  const handleResetMonthly = async () => {
    if (!participant) return;
    setMonthlyVotes((prev: any[]) => prev.filter((v: any) => v.participantId !== participant.id));
    tracked(async () => {
      await fetch("/api/monthly", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      });
      await fetchAll();
    });
  };

  const handleAvailabilitySet = async (
    retreatType: RetreatType,
    date: string,
    status: string
  ) => {
    if (!participant) return;

    const setter = retreatType === "mini" ? setMiniAvailability : setFullAvailability;
    setter((prev: any[]) => {
      const idx = prev.findIndex(
        (a: any) =>
          a.participantId === participant.id && a.retreatType === retreatType && a.date === date
      );
      // "not_set" = remove entry (back to default)
      if (status === "not_set") {
        return idx >= 0 ? prev.filter((_: any, i: number) => i !== idx) : prev;
      }
      const entry = {
        participantId: participant.id,
        retreatType,
        date,
        status,
        source: "manual",
      };
      return idx >= 0 ? prev.map((a: any, i: number) => (i === idx ? entry : a)) : [...prev, entry];
    });

    tracked(async () => {
      await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          retreatType,
          date,
          status,
        }),
      });
    });
  };

  const handleResetAvailability = async (retreatType: RetreatType) => {
    if (!participant) return;
    const setter = retreatType === "mini" ? setMiniAvailability : setFullAvailability;
    setter((prev: any[]) =>
      prev.filter(
        (a: any) =>
          !(a.participantId === participant.id && a.retreatType === retreatType && a.source === "manual")
      )
    );
    tracked(async () => {
      await fetch("/api/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, retreatType }),
      });
      // Re-sync iCal to restore calendar-imported entries that were overwritten by manual edits
      if (participant.icalUrl) {
        await fetch("/api/ical", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: participant.id, icalUrl: participant.icalUrl }),
        });
      }
      await fetchAll();
    });
  };

  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (debouncedFetchRef.current) clearTimeout(debouncedFetchRef.current);
    debouncedFetchRef.current = setTimeout(() => fetchAll(), 500);
  }, [fetchAll]);

  const handleRetreatVote = async (
    retreatType: RetreatType,
    startDate: string,
    endDate: string,
    vote: Vote | null
  ) => {
    if (!participant) return;
    tracked(async () => {
      if (vote === null) {
        const allV = retreatType === "mini" ? miniVotes : fullVotes;
        const existing = allV.find(
          (v: any) =>
            v.participantId === participant.id &&
            v.retreatType === retreatType &&
            v.startDate === startDate
        );
        if (existing) {
          await fetch("/api/retreat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              participantId: participant.id,
              retreatType,
              startDate,
              endDate,
              vote: existing.vote,
            }),
          });
        }
      } else {
        await fetch("/api/retreat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: participant.id, retreatType, startDate, endDate, vote }),
        });
      }
      await fetchAll();
    });
  };

  const handleIcalSave = async (url: string) => {
    if (!participant) return;
    const res = await fetch("/api/ical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.id, icalUrl: url }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const updatedParticipant = { ...participant, icalUrl: url || null, icalLastSynced: new Date().toISOString() };
    setParticipant(updatedParticipant);
    localStorage.setItem("participant", JSON.stringify(updatedParticipant));
    await fetchAll();
    await fetchIcalEvents();
  };

  const handleSwitchUser = () => {
    localStorage.removeItem("participant");
    window.location.href = "/";
  };

  const handleDeleteProfile = async () => {
    if (!participant) return;
    await fetch("/api/participants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.id }),
    });
    localStorage.removeItem("participant");
    window.location.href = "/";
  };

  if (loading || !participant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  const miniRange = getRetreatDateRange("mini");
  const fullRange = getRetreatDateRange("full");
  const miniDates = getAllDatesInRange(miniRange.start, miniRange.end);
  const fullDates = getAllDatesInRange(fullRange.start, fullRange.end);

  const miniRetreatBest = miniProposals.length > 0
    ? { startDate: miniProposals[0].startDate, endDate: miniProposals[0].endDate }
    : null;
  const fullRetreatBest = fullProposals.length > 0
    ? { startDate: fullProposals[0].startDate, endDate: fullProposals[0].endDate }
    : null;

  // Compute voting status for retreats (only count votes on the BEST proposal)
  const miniBestVotes = miniRetreatBest
    ? miniVotes.filter((v: any) => v.startDate === miniRetreatBest.startDate)
    : [];
  const miniVoterIds = miniBestVotes.map((v: any) => v.participantId);
  const miniAllVoted =
    participants.length > 0 &&
    new Set(miniVoterIds).size >= participants.length &&
    miniBestVotes.every((v: any) => v.vote !== "no");

  const fullBestVotes = fullRetreatBest
    ? fullVotes.filter((v: any) => v.startDate === fullRetreatBest.startDate)
    : [];
  const fullVoterIds = fullBestVotes.map((v: any) => v.participantId);
  const fullAllVoted =
    participants.length > 0 &&
    new Set(fullVoterIds).size >= participants.length &&
    fullBestVotes.every((v: any) => v.vote !== "no");

  const retreatMonths = new Set<string>();
  if (miniRetreatBest && miniAllVoted) retreatMonths.add(getMonthKey(miniRetreatBest.startDate));
  if (fullRetreatBest && fullAllVoted) retreatMonths.add(getMonthKey(fullRetreatBest.startDate));

  return (
    <div className="max-w-4xl mx-auto">
      <ParticipantHeader
        participant={participant}
        onSwitch={handleSwitchUser}
        onOpenIcal={() => setShowIcal(true)}
        onDelete={handleDeleteProfile}
      />

      {showIcal && (
        <IcalSettings
          participant={participant}
          onSave={handleIcalSave}
          onClose={() => setShowIcal(false)}
        />
      )}

      <div className="p-4">
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="mini" className="text-xs sm:text-sm">
              Mini Retreat
            </TabsTrigger>
            <TabsTrigger value="full" className="text-xs sm:text-sm">
              Full Retreat
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Monthly Friday Meetings</h2>
              <p className="text-sm text-muted-foreground">
                Pick one Friday per month, 11am–3pm. Tap to vote: Yes → If must → No → Clear.
              </p>
            </div>
            <MonthlyStatus
              participants={participants}
              allVotes={monthlyVotes}
              retreatMonths={retreatMonths}
            />
            <FridayGrid
              participant={participant}
              allVotes={monthlyVotes}
              participants={participants}
              icalEvents={icalEvents}
              onVote={handleMonthlyVote}
              retreatMonths={retreatMonths}
              onReset={handleResetMonthly}
            />
          </TabsContent>

          <TabsContent value="mini">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Mini Retreat</h2>
              <p className="text-sm text-muted-foreground">
                2 days / 1 night, June–December 2026. Mark your availability, then vote on the best
                dates.
              </p>
            </div>
            <EventStatus
              type="mini"
              participants={participants}
              votedParticipantIds={miniVoterIds}
              bestOption={
                miniRetreatBest
                  ? formatDateRange(miniRetreatBest.startDate, miniRetreatBest.endDate)
                  : null
              }
              allAgreed={miniAllVoted}
            />
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">Step 1: Your Availability</h3>
                <AvailabilityCalendar
                  participant={participant}
                  retreatType="mini"
                  allAvailability={miniAvailability}
                  participants={participants}
                  dates={miniDates}
                  onSetStatus={(date, status) => handleAvailabilitySet("mini", date, status)}
                  onPaintEnd={scheduleRefresh}
                  onReset={() => handleResetAvailability("mini")}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Step 2: Vote on Best Periods</h3>
                <RetreatProposals
                  participant={participant}
                  retreatType="mini"
                  proposals={miniProposals}
                  allVotes={miniVotes}
                  participants={participants}
                  onVote={(s, e, v) => handleRetreatVote("mini", s, e, v)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="full">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Full Retreat</h2>
              <p className="text-sm text-muted-foreground">
                4 days / 3 nights, June 2026–May 2027. Mark your availability, then vote on the
                best dates.
              </p>
            </div>
            <EventStatus
              type="full"
              participants={participants}
              votedParticipantIds={fullVoterIds}
              bestOption={
                fullRetreatBest
                  ? formatDateRange(fullRetreatBest.startDate, fullRetreatBest.endDate)
                  : null
              }
              allAgreed={fullAllVoted}
            />
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">Step 1: Your Availability</h3>
                <AvailabilityCalendar
                  participant={participant}
                  retreatType="full"
                  allAvailability={fullAvailability}
                  participants={participants}
                  dates={fullDates}
                  onSetStatus={(date, status) => handleAvailabilitySet("full", date, status)}
                  onPaintEnd={scheduleRefresh}
                  onReset={() => handleResetAvailability("full")}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Step 2: Vote on Best Periods</h3>
                <RetreatProposals
                  participant={participant}
                  retreatType="full"
                  proposals={fullProposals}
                  allVotes={fullVotes}
                  participants={participants}
                  onVote={(s, e, v) => handleRetreatVote("full", s, e, v)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Combined Calendar</h2>
              <p className="text-sm text-muted-foreground">
                Overview of all scheduled events. Hover or tap highlighted dates to see who is
                unavailable.
              </p>
            </div>
            <CombinedCalendar
              monthlyVotes={monthlyVotes}
              miniRetreatBest={miniRetreatBest}
              fullRetreatBest={fullRetreatBest}
              participants={participants}
              miniAvailability={miniAvailability}
              fullAvailability={fullAvailability}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
