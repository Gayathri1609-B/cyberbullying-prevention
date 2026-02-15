import sys
import re

text = sys.argv[1].lower()

# -----------------------------
# BAD WORD LIST (you can add more)
# -----------------------------
bad_words = [
    # English
    "ugly",
    "bastard",
    "idiot",
    "stupid",
    "loser",
    "hate",
    "fool",
    "shit",
    "asshole",

    # Tamil (english letters)
    "thevidiya",
    "punda",
    "otha",
    "loosu",
    "naaye",

    # Tamil unicode
    "தேவிடியா",
    "புண்ட",
    "நாய்",
    "முட்டாள்",
    "லூசு"
]

# -----------------------------
# CHECK LOGIC
# -----------------------------
for word in bad_words:
    pattern = r"\b" + re.escape(word) + r"\b"
    if re.search(pattern, text):
        print("ABUSIVE")
        sys.exit(0)

# -----------------------------
# NO BAD WORD → SAFE
# -----------------------------
print("SAFE")
