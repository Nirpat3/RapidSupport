import LoginForm from '../LoginForm';

export default function LoginFormExample() {
  return (
    <LoginForm 
      onLogin={(email, password) => {
        console.log('Demo login:', { email, password });
        alert(`Login demo: ${email}`);
      }}
    />
  );
}