from chat.service import build_messages, format_store_lines


def test_build_messages_order() -> None:
    messages = build_messages(
        "Which store is nearest?",
        [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello"}],
        ["- Store 1 (Kothamangalam, 1.2 km)"],
    )

    assert messages[0]["role"] == "system"
    assert "DailyDrop" in messages[0]["content"]
    assert messages[1]["role"] == "system"
    assert "Store 1" in messages[1]["content"]
    assert messages[-1] == {"role": "user", "content": "Which store is nearest?"}
    assert messages[-3]["content"] == "Hi"


def test_format_store_lines_skips_inactive_and_caps_list() -> None:
    lines = format_store_lines(
        [
            {
                "store_name": "Closed Mart",
                "town": "Thodupuzha",
                "distance_km": 0.4,
                "is_active": False,
            },
            {
                "store_name": "Store 1",
                "town": "Kothamangalam",
                "distance_km": 1.2,
                "is_active": True,
            },
        ]
    )
    assert lines == ["- Store 1 (Kothamangalam, 1.2 km)"]
