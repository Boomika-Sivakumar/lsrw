"""Fill the Mistake Heatmap with realistic mistake records for all students.

Creates grammar / pronunciation / vocabulary / fluency / writing / communication
mistakes spread across the last 12 weeks so the student dashboard heatmap and
recent-mistakes sections show real content. Weaknesses already come from scores.

Usage (backend/):  ../.venv/Scripts/python seed_heatmap.py
"""
import datetime

from app.database.db import SessionLocal
from app.models.practice import Mistake
from app.models.user import User

# category -> list of (incorrect text, corrected text, explanation)
MISTAKES = {
    "grammar": [
        ("She go to school every day.", "She goes to school every day.", "Use 'goes' (third person singular) with 'she'."),
        ("I have went to the market.", "I have gone to the market.", "Use the past participle 'gone' after 'have'."),
        ("He don't like coffee.", "He doesn't like coffee.", "Use 'doesn't' with 'he' in negative sentences."),
        ("I am agree with you.", "I agree with you.", "'Agree' is a verb; do not use 'am' before it."),
        ("She was born in 2001 year.", "She was born in 2001.", "Do not add 'year' after a specific year."),
        ("We was very happy.", "We were very happy.", "Use 'were' with plural subjects like 'we'."),
        ("He can to swim fast.", "He can swim fast.", "Drop 'to' after modal verbs like 'can'."),
        ("I did not went there.", "I did not go there.", "After 'did not', use the base verb 'go'."),
        ("There is many students in class.", "There are many students in class.", "Use 'are' with plural nouns like 'students'."),
        ("She don't has any time.", "She doesn't have any time.", "Use 'doesn't have', not 'don't has'."),
    ],
    "pronunciation": [
        ("Mispronounced 'comfortable' as com-for-ta-ble.", "comfortable (cumf-tuh-bull)", "Stress the first syllable and drop the middle vowel."),
        ("Mispronounced 'vegetable' with four syllables.", "vegetable (vej-tuh-bull)", "Native speakers pronounce it with three syllables."),
        ("Mispronounced 'th' in 'think' as 's'.", "think /θɪŋk/", "Place your tongue between your teeth for the 'th' sound."),
        ("Mispronounced 'world' as 'word'.", "world /wɜːrld/", "Keep the 'l' sound at the end of 'world'."),
        ("Mispronounced 'restaurant' stress on the last syllable.", "restaurant (RES-tuh-rahnt)", "Stress the first syllable: RES-tuh-rahnt."),
        ("Mispronounced 'clothes' dropping the 'th'.", "clothes /kloʊðz/", "Keep the voiced 'th' before the 'z' sound."),
    ],
    "vocabulary": [
        ("Used 'big' instead of a more precise word.", "large / huge / enormous", "Match the word to the context for a stronger meaning."),
        ("Used 'make a photo' instead of 'take a photo'.", "take a photo", "We 'take' photos and 'make' decisions."),
        ("Used 'do a mistake' instead of 'make a mistake'.", "make a mistake", "'Make' collocates with 'mistake', 'decision', and 'plan'."),
        ("Used 'informations' as a plural.", "information (uncountable)", "'Information' has no plural; say 'pieces of information'."),
        ("Used 'housework' for office tasks.", "work / tasks", "Use topic-appropriate words: 'tasks' or 'assignments' at work."),
        ("Used 'childrens' as a plural.", "children", "'Children' is already plural; do not add 's'."),
    ],
    "fluency": [
        ("Frequent filler 'um' between sentences.", "Pause briefly instead of using 'um'.", "Replace fillers with a short, silent pause to sound confident."),
        ("Repeated 'like' as a filler word.", "Avoid 'like' as a filler.", "Use 'like' only for comparisons, not as a pause word."),
        ("Long hesitations before starting answers.", "Start with the main point first.", "Answer the question directly, then add details."),
        ("Frequent 'you know' pauses.", "Replace with a confident pause.", "Train with timed speaking to reduce hesitation."),
    ],
    "writing": [
        ("Run-on sentence: 'I like coffee I drink it daily'.", "I like coffee. I drink it daily.", "Separate complete thoughts into sentences."),
        ("Sentence fragment: 'Because it was raining.'", "Because it was raining, we stayed home.", "A 'because' clause needs a main clause."),
        ("Subject-verb agreement in an email.", "Ensure the verb matches the subject.", "Check singular/plural agreement before sending."),
        ("Missing article: 'I bought car yesterday.'", "I bought a car yesterday.", "Use 'a/an/the' before countable nouns."),
    ],
    "communication": [
        ("Interrupted a speaker mid-sentence.", "Wait for a pause before contributing.", "Let the speaker finish, then link your idea to theirs."),
        ("Gave a one-word answer in discussion.", "Expand with a reason or example.", "Add one reason or example to every short answer."),
        ("Spoke over another participant.", "Take turns and acknowledge others.", "Use turn-taking phrases: 'I would add that...'."),
        ("Did not acknowledge the previous speaker.", "Build on others' points.", "Refer to the previous point: 'As you said...'."),
    ],
}

TODAY = datetime.date.today()


def week_dates(weeks_back: int) -> datetime.datetime:
    """Return a datetime inside a specific week (0 = current week)."""
    start = TODAY - datetime.timedelta(days=TODAY.weekday(), weeks=weeks_back)
    return datetime.datetime.combine(start + datetime.timedelta(days=2), datetime.time(hour=15))


def seed():
    db = SessionLocal()
    students = db.query(User).filter(User.role == "student").all()
    for s in students:
        # clear existing mistakes for a clean, consistent heatmap
        db.query(Mistake).filter(Mistake.student_id == s.id).delete(synchronize_session=False)

    # Design a per-week spread so every category appears with variation.
    # Each week gets 3-6 mistakes drawn from a rotating selection.
    weekly_counts = [4, 3, 5, 2, 4, 3, 3, 2, 4, 2, 3, 3]
    for s in students:
        for week, count in enumerate(weekly_counts):
            cats = list(MISTAKES.keys())
            chosen = []
            for _ in range(count):
                cat = cats[week % len(cats) if _ == 0 else (_ + week) % len(cats)]
                pool = MISTAKES[cat]
                text, corrected, expl = pool[(_ + week) % len(pool)]
                chosen.append((cat, text, corrected, expl))
            detected = week_dates(12 - 1 - week)
            for i, (cat, text, corrected, expl) in enumerate(chosen):
                db.add(Mistake(
                    student_id=s.id,
                    category=cat,
                    text=text,
                    corrected_text=corrected,
                    explanation=expl,
                    occurrences=1 + ((i + week) % 3),
                    first_detected=detected,
                    last_detected=detected + datetime.timedelta(hours=i),
                    status="Needs Improvement",
                ))
        print(f"  seeded {s.username:10} ({s.user_id})")

    db.commit()
    total = db.query(Mistake).count()
    print(f"\nDone. Total mistake records now: {total}")


if __name__ == "__main__":
    seed()