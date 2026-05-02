"""
Customer-side LLM for simulation mode.

Wraps BedrockClient as a plain LLM (no tools) that plays the role of a
residential internet customer with a specific problem scenario.  Used by
main.py --simulate to drive the conversation without a human at the keyboard.
"""
from __future__ import annotations

import config
from llm.bedrock_client import BedrockClient

# ---------------------------------------------------------------------------
# Default customer persona / scenario prompt
# ---------------------------------------------------------------------------

_DEFAULT_CUSTOMER_SYSTEM_PROMPT = """\
You are a residential internet customer calling tech support because your home \
internet has been slow for the past two days.  You live at 123 Maple Street and \
your account is under the name Jane Doe (customer ID C-10042).

BEHAVIOUR RULES
---------------
- Respond as a real, slightly frustrated but cooperative customer would on a \
  phone call.
- Keep each reply short — 1 to 3 sentences, natural spoken English.
- Provide information only when asked; do not volunteer everything upfront.
- If the rep gives you an instruction to follow (e.g. reboot your modem), \
  acknowledge it and report a plausible outcome on your next message.
- If the rep's suggestion resolves the problem, thank them and say the \
  connection feels faster.
- Do NOT break character or reference the fact that you are an AI.
- Do NOT use markdown, bullet points, or formal structure.
"""


# ---------------------------------------------------------------------------
# CustomerLLM
# ---------------------------------------------------------------------------

class CustomerLLM:
    """Plain LLM that simulates a customer on the other side of the conversation.

    Maintains its own conversation history so follow-up messages are coherent.

    Args:
        system_prompt:  Override the default customer persona.
        model_id:       Bedrock model ID.  Defaults to ``config.CUSTOMER_MODEL_ID``.
        region:         AWS region.  Defaults to ``config.AWS_REGION``.
    """

    def __init__(
        self,
        system_prompt: str | None = None,
        model_id: str | None = None,
        region: str | None = None,
    ) -> None:
        self._system = system_prompt or _DEFAULT_CUSTOMER_SYSTEM_PROMPT
        self._bedrock = BedrockClient(
            model_id=model_id or config.CUSTOMER_MODEL_ID,
            region=region or config.AWS_REGION,
        )
        # Converse-format message history
        self._history: list[dict] = []

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def opening_message(self) -> str:
        """Generate the customer's very first message to start the session."""
        # Seed the history with a cue and get the first customer utterance
        self._history.append({
            "role": "user",
            "content": [{"text": "Please start the conversation by telling the rep why you are calling."}],
        })
        response = self._bedrock.invoke(
            system=self._system,
            messages=self._history,
            max_tokens=200,
            temperature=0.7,
        )
        reply = response["text"].strip()
        # Replace the seed cue with the actual assistant reply in history
        self._history[-1] = {"role": "user", "content": [{"text": "[call connected]"}]}
        self._history.append({"role": "assistant", "content": [{"text": reply}]})
        return reply

    def reply(self, rep_message: str) -> str:
        """Respond to a message from the rep (agent suggestion).

        Args:
            rep_message:  The agent's latest suggestion / question.

        Returns:
            The customer's next spoken reply.
        """
        self._history.append({
            "role": "user",
            "content": [{"text": rep_message}],
        })
        response = self._bedrock.invoke(
            system=self._system,
            messages=self._history,
            max_tokens=200,
            temperature=0.7,
        )
        reply = response["text"].strip()
        self._history.append({"role": "assistant", "content": [{"text": reply}]})
        return reply

    def reset(self) -> None:
        """Clear conversation history to start a fresh scenario."""
        self._history.clear()
