import ShiftDetail from './shift-detail.client';

export default function ShiftDetailPage({
  params,
}: {
  params: { shiftId: string };
}) {
  return <ShiftDetail params={params} />;
}
