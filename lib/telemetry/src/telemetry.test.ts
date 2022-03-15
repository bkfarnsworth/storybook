import fetch from 'isomorphic-unfetch';

import { sendTelemetry } from './telemetry';

jest.mock('isomorphic-unfetch');

const fetchMock = fetch as jest.Mock;

beforeEach(() => {
  fetchMock.mockResolvedValue({ status: 200 });
});

it('makes a fetch request with name and data', async () => {
  fetchMock.mockClear();
  expect(await sendTelemetry({ operationType: 'test', payload: { foo: 'bar' } })).toBe(true);

  expect(fetch).toHaveBeenCalledTimes(1);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body).toMatchObject({
    operationType: 'test',
    payload: { foo: 'bar' },
  });
});

it('retries if fetch fails with a 503', async () => {
  fetchMock.mockClear().mockResolvedValueOnce({ status: 503 });
  expect(
    await sendTelemetry({ operationType: 'test', payload: { foo: 'bar' } }, { retryDelay: 0 })
  ).toBe(true);

  expect(fetch).toHaveBeenCalledTimes(2);
});

it('gives up if fetch repeatedly fails', async () => {
  fetchMock.mockClear().mockResolvedValue({ status: 503 });
  expect(
    await sendTelemetry({ operationType: 'test', payload: { foo: 'bar' } }, { retryDelay: 0 })
  ).toBe(false);

  expect(fetch).toHaveBeenCalledTimes(4);
});
