"""Static content banks used to build the initial/final LSRW assessments.

The audio player plays the `script` text via the browser's speech synthesis so
listening exercises work without pre-recorded audio files.
"""

LISTENING_SCRIPTS = [
    {
        "title": "Morning Workshop Announcement",
        "script": "Good morning everyone. Today's workshop will begin at ten in room 204. Please bring your student ID cards. Lunch will be served at one in the cafeteria.",
        "questions": [
            {"q": "What time does the workshop begin?", "answer": "ten or 10 o'clock"},
            {"q": "Which room is the workshop in?", "answer": "room 204"},
            {"q": "Where will lunch be served?", "answer": "the cafeteria"},
        ],
    },
    {
        "title": "Evening Weather Report",
        "script": "Here is today's weather. The morning will be sunny with a high of twenty-five degrees. By evening, clouds will move in and light rain is expected around nine. Tomorrow will be cooler.",
        "questions": [
            {"q": "What is the forecast for the morning?", "answer": "sunny"},
            {"q": "What is the high temperature expected?", "answer": "twenty-five or 25 degrees"},
            {"q": "When is light rain expected?", "answer": "around nine or in the evening"},
        ],
    },
    {
        "title": "Library Weekend Notice",
        "script": "The library will close early on Friday at five. The online catalogue will be unavailable from Saturday to Monday for maintenance. Please return borrowed books before the weekend.",
        "questions": [
            {"q": "What time does the library close on Friday?", "answer": "five or 5 o'clock"},
            {"q": "When will the online catalogue be unavailable?", "answer": "saturday to monday"},
            {"q": "What should students do before the weekend?", "answer": "return borrowed books"},
        ],
    },
]

READING_PASSAGES = [
    {
        "title": "The Benefits of Reading",
        "text": "Reading regularly improves vocabulary, concentration, and empathy. Studies show that people who read for at least twenty minutes a day retain information better and communicate more clearly. Schools encourage reading programs because strong readers tend to perform well across all subjects.",
        "questions": [
            {"type": "mcq", "q": "What is the main idea of the passage?", "options": ["Reading is a waste of time", "Reading improves several mental abilities", "Only students should read", "Reading is difficult for everyone"], "answer": 1},
            {"type": "truefalse", "q": "Reading twenty minutes a day can help people retain information better.", "answer": "true"},
            {"type": "shortanswer", "q": "Name one benefit of reading mentioned in the passage.", "answer": "vocabulary or concentration or empathy"},
        ],
    },
    {
        "title": "Artificial Intelligence at Work",
        "text": "Artificial intelligence is changing the workplace by automating repetitive tasks. While some fear job losses, experts argue that AI creates new roles that require human judgment and creativity. The key is to use AI as a tool that supports people rather than replaces them.",
        "questions": [
            {"type": "mcq", "q": "What does the passage say AI automates?", "options": ["Creative thinking", "Repetitive tasks", "Human judgment", "Team meetings"], "answer": 1},
            {"type": "truefalse", "q": "Experts believe AI should replace people at work.", "answer": "false"},
            {"type": "shortanswer", "q": "According to the passage, what roles does AI create?", "answer": "roles that require human judgment and creativity"},
        ],
    },
    {
        "title": "Healthy Habits",
        "text": "Sleep, exercise, and nutrition form the foundation of good health. Experts recommend at least seven hours of sleep, thirty minutes of moderate exercise, and a balanced diet. Small consistent changes matter more than short-term extreme efforts.",
        "questions": [
            {"type": "mcq", "q": "How many hours of sleep do experts recommend?", "options": ["Five hours", "Six hours", "At least seven hours", "Nine hours"], "answer": 2},
            {"type": "truefalse", "q": "Short-term extreme efforts are better than small consistent changes.", "answer": "false"},
            {"type": "shortanswer", "q": "Name one foundation of good health mentioned.", "answer": "sleep or exercise or nutrition"},
        ],
    },
]

WRITING_PROMPTS = [
    {"type": "email", "title": "Professional Email", "prompt": "Write a professional email to your manager requesting two days of leave next week. Explain the reason and how you will ensure your work continues. (80-150 words)"},
    {"type": "essay", "title": "Short Essay", "prompt": "Write a short essay on: 'The importance of communication skills in the modern workplace.' (120-200 words)"},
    {"type": "summary", "title": "Article Summary", "prompt": "Summarize the following in 3-4 sentences: 'Remote work has grown rapidly. Companies report both higher productivity and new challenges such as isolation and work-life boundaries. Many organizations now adopt hybrid models that combine office and home days.'"},
    {"type": "application", "title": "Cover Letter", "prompt": "Write a cover letter applying for an entry-level position at a company of your choice. (80-150 words)"},
]

SPEAKING_TOPICS = [
    {"topic": "Describe your hometown.", "min_words": 40},
    {"topic": "Describe your career goal.", "min_words": 40},
    {"topic": "Describe a memorable trip.", "min_words": 40},
]

MOCK_INTERVIEW_QUESTIONS = [
    "Tell me about yourself.",
    "What are your strengths and weaknesses?",
    "Why do you want this role?",
    "Describe a challenge you overcame.",
    "Where do you see yourself in five years?",
    "How do you handle pressure or deadlines?",
    "Tell me about a time you worked in a team.",
    "Why should we hire you?",
]

CONVERSATION_SCENARIOS = [
    {"id": "self-introduction", "label": "Self Introduction", "description": "Practice introducing yourself and talking about your goals."},
    {"id": "workplace", "label": "Workplace Conversation", "description": "Talk about a typical workday and teamwork."},
    {"id": "customer-interaction", "label": "Customer Interaction", "description": "Handle a customer inquiry politely and clearly."},
    {"id": "travel", "label": "Travel Conversation", "description": "Discuss travel plans and experiences."},
    {"id": "meetings", "label": "Business Meeting", "description": "Share updates and opinions in a meeting."},
    {"id": "daily-communication", "label": "Daily Communication", "description": "Everyday small talk and casual conversation."},
    {"id": "hr-discussion", "label": "HR Discussion", "description": "Discuss experience, expectations and feedback."},
    {"id": "professional-communication", "label": "Professional Communication", "description": "Clear, professional exchanges with stakeholders."},
]

PRESENTATION_TOPICS = [
    "The future of artificial intelligence",
    "Why communication skills matter",
    "My career goals and how I plan to achieve them",
    "The importance of teamwork",
    "How technology is changing education",
]
