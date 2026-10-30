import { redirect } from 'next/navigation';
import { PAD_ID } from '@/lib/languages';
import PadView from './pad-view';

export const metadata = { title: 'Riff' };

export default async function PadPage({ params }) {
  const { id } = await params;
  if (!PAD_ID.test(id)) redirect('/');
  return <PadView padId={id} />;
}
