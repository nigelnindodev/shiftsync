import ShiftDetail from './shift-detail.client';
import { notFound } from 'next/navigation';

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const id = parseInt(shiftId, 10);

  if (isNaN(id)) {
    notFound();
  }

  return <ShiftDetail shiftId={id} />;
}
