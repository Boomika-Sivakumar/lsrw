"""Speaker identification service abstraction.

Requirements: every spoken segment must be associated with the correct User ID.

In the development/mock implementation each participant's client sends its own
speech segments tagged with its User ID (the client knows who is speaking because
the user is authenticated). The mock service trusts those client-side labels and
performs simple overlap detection to flag interruptions.

For production, plug in a real speaker-diarization backend (e.g. a diarization
provider) by implementing the same interface. The API layer only talks to this
abstraction, never to a specific vendor.
"""
from typing import Dict, List


class SpeakerSegmentInput:
    """A raw speech segment waiting to be assigned to a speaker."""

    def __init__(self, text: str, start_time: float = 0, end_time: float = 0, claimed_speaker: str = ""):
        self.text = text
        self.start_time = start_time
        self.end_time = end_time
        self.claimed_speaker = claimed_speaker


class SpeakerIdentificationService:
    """Assigns User IDs to speech segments.

    `mode` describes which backend is used. `dev-client-labeled` means segments
    carry the User ID sent by the authenticated client (valid for demos where a
    diarization model is unavailable). This is NOT real voice-based speaker
    identification; it is clearly marked as a development implementation.
    """

    mode = "dev-client-labeled"

    def identify(self, segments: List[SpeakerSegmentInput]) -> List[dict]:
        """Return segments with resolved speaker user IDs.

        Each returned dict: {speaker, text, start_time, end_time, is_interruption,
        interrupted_speaker}.
        """
        results = []
        prev = None
        for seg in segments:
            speaker = seg.claimed_speaker or ""
            is_interruption = "false"
            interrupted = ""
            # Simple interruption heuristic: a segment that starts before the
            # previous speaker's segment ended is flagged as overlapping.
            if prev and seg.start_time < prev.end_time and speaker != prev["speaker"]:
                is_interruption = "true"
                interrupted = prev["speaker"]
            results.append(
                {
                    "speaker": speaker,
                    "text": seg.text,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "is_interruption": is_interruption,
                    "interrupted_speaker": interrupted,
                }
            )
            prev = results[-1]
        return results


def get_speaker_service() -> SpeakerIdentificationService:
    return SpeakerIdentificationService()