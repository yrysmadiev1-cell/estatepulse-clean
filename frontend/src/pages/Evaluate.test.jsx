import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Evaluate from './Evaluate';
import { MemoryRouter } from 'react-router-dom';
import { evaluateProperty, getModelMetadata } from '../utils/api';
vi.mock('../utils/api');
vi.mock('../components/SiteHeader', () => ({ default: () => null }));
vi.mock('../components/SiteFooter', () => ({ default: () => null }));
const metadata = { bounds: { area: [15, 300], rooms: [1, 13], floor: [1, 50], total_floors: [1, 50], ceiling_height: [2, 5], year_built: [1900, 2026] }, categories: { house_type: ['unknown', 'кирпичный'], condition: ['unknown', 'свежий ремонт'], district: ['unknown', 'Есильский р-н'] } };
beforeEach(() => { vi.clearAllMocks(); getModelMetadata.mockResolvedValue(metadata); });
test('submits exact model categories and displays the server price per square metre', async () => {
  evaluateProperty.mockResolvedValue({ predicted_price: 32500000, price_per_m2: 500000, saved: false });
  render(<MemoryRouter><Evaluate /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Тип дома'), { target: { value: 'кирпичный' } });
  fireEvent.change(screen.getByLabelText('Состояние'), { target: { value: 'свежий ремонт' } });
  fireEvent.click(screen.getByRole('button', { name: 'Оценить квартиру' }));
  await waitFor(() => expect(evaluateProperty).toHaveBeenCalledWith(expect.objectContaining({ house_type: 'кирпичный', condition: 'свежий ремонт', year_built: 2015, city: 'Астана' }), null));
  expect(await screen.findByText(/500.*000 ₸ за м²/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Площадь (м²)'), { target: { value: '80' } });
  expect(screen.queryByText(/500.*000 ₸ за м²/)).not.toBeInTheDocument();
});
test('rejects a floor above the building height without calling the API', async () => {
  render(<MemoryRouter><Evaluate /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Этаж'), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: 'Оценить квартиру' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Этаж не может');
  expect(evaluateProperty).not.toHaveBeenCalled();
});
