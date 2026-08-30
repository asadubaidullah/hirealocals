export default function Template({
  children
}:{
  children:React.ReactNode
}){
  return (
    <div className="hal-route-transition">
      {children}
    </div>
  );
}

