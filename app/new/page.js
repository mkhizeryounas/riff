import NewPadForm from './new-pad-form';

export const metadata = { title: 'New pad · Riff' };

export default function NewPadPage() {
  return (
    <div className="new-pad">
      <NewPadForm />
    </div>
  );
}
