import { describe, expect, it } from 'vitest';
import { billsFromPath, groupEventsByDay, splitEventTime, trackingPath, trackStep, UNKNOWN_DAY } from './tracking-detail';

describe('trackingPath / billsFromPath', () => {
  it('1 mã, nhiều mã, mã đang xem', () => {
    expect(trackingPath(['6165957'])).toBe('/tracking/6165957');
    expect(trackingPath(['6165957', 'VA10000001'], 'VA10000001')).toBe('/tracking/6165957,VA10000001?awb=VA10000001');
    expect(trackingPath(['6165957', 'VA10000001'], '6165957')).toBe('/tracking/6165957,VA10000001');
  });
  it('đọc lại từ đường dẫn, chuẩn hoá và bỏ mã sai', () => {
    expect(billsFromPath('6165957,va10000001,%20x')).toEqual(['6165957', 'VA10000001']);
    expect(billsFromPath(undefined)).toEqual([]);
  });
});

describe('splitEventTime', () => {
  it('định dạng backend dd/MM/yyyy HH:mm và chỉ có ngày', () => {
    expect(splitEventTime('28/09/2026 17:39')).toEqual({ day: '28/09/2026', time: '17:39' });
    expect(splitEventTime('05/01/2026')).toEqual({ day: '05/01/2026', time: '' });
  });
  it('ISO và chuỗi lạ', () => {
    expect(splitEventTime('2026-09-28T17:39:00Z')).toEqual({ day: '28/09/2026', time: '17:39' });
    expect(splitEventTime('')).toEqual({ day: UNKNOWN_DAY, time: '' });
  });
});

describe('groupEventsByDay', () => {
  it('gom các mốc liên tiếp cùng ngày, giữ thứ tự mới nhất trước', () => {
    const days = groupEventsByDay([
      { time: '28/09/2026 17:39', title: 'Waiting for next schedule flight', location: 'Singapore, SG' },
      { time: '28/09/2026 08:08', title: 'Waiting for next schedule flight', location: 'Singapore, SG' },
      { time: '27/09/2026 15:26', title: 'Arrived Airport', location: 'Singapore, SG' }
    ]);
    expect(days.map(d => d.day)).toEqual(['28/09/2026', '27/09/2026']);
    expect(days[0]!.items.map(i => i.time)).toEqual(['17:39', '08:08']);
  });
  it('không có mốc nào', () => {
    expect(groupEventsByDay([])).toEqual([]);
  });
});

describe('trackStep', () => {
  it('ánh xạ trạng thái sang bước tiến trình', () => {
    expect(trackStep('wait')).toEqual({ current: 0, problem: false });
    expect(trackStep('fly')).toEqual({ current: 2, problem: false });
    expect(trackStep('nd')).toEqual({ current: 2, problem: true });
    expect(trackStep('ok')).toEqual({ current: 3, problem: false });
  });
});
