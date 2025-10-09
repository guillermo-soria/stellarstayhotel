describe('debug-dates placeholder', () => {
  it('should run placeholder test', () => {
    const checkIn = new Date('2025-01-01');
    const checkOut = new Date('2025-01-05');
    expect(checkOut.getTime()).toBeGreaterThan(checkIn.getTime());
  });
});
