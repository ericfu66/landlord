const SEND_COOLDOWN_MS = 3000
const userLastSendAt = new Map<number, number>()

export function checkGroupChatCooldown(userId: number): number {
  const now = Date.now()
  const last = userLastSendAt.get(userId)
  if (!last) {
    userLastSendAt.set(userId, now)
    return 0
  }

  const elapsed = now - last
  if (elapsed >= SEND_COOLDOWN_MS) {
    userLastSendAt.set(userId, now)
    return 0
  }

  return SEND_COOLDOWN_MS - elapsed
}

export function resetGroupChatCooldownForTest() {
  userLastSendAt.clear()
}
