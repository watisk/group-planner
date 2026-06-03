export const metadata = {
  title: 'Group Planner 📅',
  description: 'Shared availability planner',
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{children}</body>
    </html>
  )
}
