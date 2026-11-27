from aesop import tokens as T
from aesop.prompt import Reference, extract_audio_tokens, format_text, inference_prompt, training_example


def fake_encode(s: str) -> list[int]:
    # Like a Llama-3 tokenizer: BOS then one id per character.
    return [T.BEGIN_OF_TEXT] + [ord(c) for c in s]


AUDIO = T.codes_to_tokens([1, 2], [3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13, 14])


def test_format_text():
    assert format_text("  hello\n world ", "tara") == "tara: hello world"
    assert format_text("hi") == "hi"


def test_training_example_layout_and_masking():
    ex = training_example(fake_encode, "hi", AUDIO, voice="v")
    text_ids = fake_encode("v: hi")
    prompt = [T.START_OF_HUMAN, *text_ids, T.END_OF_TEXT, T.END_OF_HUMAN]
    answer = [T.START_OF_AI, T.START_OF_SPEECH, *AUDIO, T.END_OF_SPEECH, T.END_OF_AI]
    assert ex.input_ids == prompt + answer
    assert ex.labels == [-100] * len(prompt) + answer


def test_training_example_full_loss():
    ex = training_example(fake_encode, "hi", AUDIO, train_on_text=True)
    assert ex.labels == ex.input_ids


def test_bos_added_if_tokenizer_omits_it():
    ex = training_example(lambda s: [ord(c) for c in s], "hi", AUDIO)
    assert ex.input_ids[:2] == [T.START_OF_HUMAN, T.BEGIN_OF_TEXT]


def test_inference_prompt_ends_at_speech_start():
    p = inference_prompt(fake_encode, "hello", voice="tara")
    assert p[0] == T.START_OF_HUMAN
    assert p[-4:] == [T.END_OF_TEXT, T.END_OF_HUMAN, T.START_OF_AI, T.START_OF_SPEECH]


def test_cloning_prompt_puts_reference_first():
    ref = Reference("ref words", AUDIO)
    p = inference_prompt(fake_encode, "target", reference=ref)
    ref_turn = training_example(fake_encode, "ref words", AUDIO).input_ids
    assert p[: len(ref_turn)] == ref_turn
    assert p[-2:] == [T.START_OF_AI, T.START_OF_SPEECH]


def test_extract_audio_tokens():
    gen = [T.START_OF_AI, T.START_OF_SPEECH, *AUDIO, T.END_OF_SPEECH, T.END_OF_AI, *AUDIO]
    assert extract_audio_tokens(gen) == AUDIO
    # Constrained generation starts right after the prompt's START_OF_SPEECH.
    assert extract_audio_tokens([*AUDIO, T.END_OF_SPEECH]) == AUDIO
