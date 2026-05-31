export const getInviteEmailHtml = (inviterName: string, signupUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to CodeRun</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f9f9fa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      border: 1px solid #eaeaea;
    }
    .header {
      background-color: #ffffff;
      padding: 30px 40px;
      text-align: center;
      border-bottom: 1px solid #eaeaea;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #4f46e5;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    .benefits-list {
      margin: 30px 0;
      padding: 0;
      list-style: none;
    }
    .benefit-item {
      display: flex;
      margin-bottom: 15px;
      align-items: flex-start;
    }
    .benefit-icon {
      font-size: 20px;
      margin-right: 15px;
    }
    .benefit-text {
      margin: 0;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      background-color: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      display: inline-block;
    }
    .footer {
      background-color: #f9f9fa;
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #888888;
      border-top: 1px solid #eaeaea;
    }
    .link {
      color: #4f46e5;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">CODERUN</h1>
      <!-- TOP LINK -->
      <div style="margin-top: 15px; font-size: 12px;">
        <a href="${signupUrl}" class="link">Quick Sign Up</a>
      </div>
    </div>
    
    <div class="content">
      <h2 class="title">${inviterName} has invited you to join CodeRun!</h2>
      
      <p>Hey there,</p>
      <p>Your friend <strong>${inviterName}</strong> thinks you'd be a great fit for CodeRun, an intelligent platform designed to accelerate your Data Structures and Algorithms (DSA) preparation.</p>
      
      <!-- MIDDLE LINK (Button CTA) -->
      <div class="btn-container">
        <a href="${signupUrl}" class="btn">Accept Invitation & Join Now</a>
      </div>

      <h3>Why join CodeRun?</h3>
      <ul class="benefits-list">
        <li class="benefit-item">
          <span class="benefit-icon">🧠</span>
          <p class="benefit-text"><strong>Personalized AI Mentorship:</strong> Get instant, dynamic feedback and coaching tailored specifically to your LeetCode performance and learning style.</p>
        </li>
        <li class="benefit-item">
          <span class="benefit-icon">⚔️</span>
          <p class="benefit-text"><strong>Multiplayer Challenges:</strong> Compete with friends in real-time DSA battles and climb the global leaderboard.</p>
        </li>
        <li class="benefit-item">
          <span class="benefit-icon">📈</span>
          <p class="benefit-text"><strong>Smart Progress Tracking:</strong> Automatically syncs with your LeetCode profile to identify weaknesses and recommend targeted daily quests.</p>
        </li>
      </ul>
      
      <p>Ready to level up your coding skills?</p>
      
      <!-- BOTTOM LINK (Button CTA) -->
      <div class="btn-container">
        <a href="${signupUrl}" class="btn">Create Your Free Account</a>
      </div>
    </div>
    
    <div class="footer">
      <p>You received this email because ${inviterName} invited you to CodeRun.</p>
      <p>&copy; ${new Date().getFullYear()} CodeRun Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
