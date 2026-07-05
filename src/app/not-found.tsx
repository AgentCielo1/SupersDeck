export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold opacity-40">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <a href="/" className="text-primary underline text-sm">Return home</a>
      </div>
    </div>
  )
}
