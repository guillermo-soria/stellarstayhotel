// Debug test to understand date behavior
describe('Debug PricingEngine Dates', () => {
  it('should understand date handling', () => {
    // Check Dec 7, 2024 specifically
    const dec7 = new Date('2024-12-07');
    console.log('Dec 7, 2024:', dec7.toISOString(), 'Day:', dec7.getDay()); // 0=Sunday, 6=Saturday
    
    // Check actual weekend days in December 2024
    const dec14 = new Date('2024-12-14'); // Saturday
    const dec15 = new Date('2024-12-15'); // Sunday
    console.log('Dec 14, 2024:', dec14.toISOString(), 'Day:', dec14.getDay());
    console.log('Dec 15, 2024:', dec15.toISOString(), 'Day:', dec15.getDay());
  });
});
