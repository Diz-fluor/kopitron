// Короткая запись адреса: UQAb…12cd
export const shortAddress = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
