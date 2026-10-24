/* ==========================================================================
   SkillSync Backend - GitHub REST API Integration & Real Data Engine
   ========================================================================== */

const fetchGitHubUserData = async (username) => {
  try {
    const cleanUsername = username ? username.trim().replace(/^@/, '') : '';
    if (!cleanUsername) {
      throw new Error('GitHub username is required.');
    }

    const headers = {
      'User-Agent': 'SkillSync-AI-App',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch User Profile
    const profileRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, { headers });
    if (profileRes.status === 404) {
      throw new Error('GitHub profile not found.');
    }
    if (!profileRes.ok) {
      throw new Error(`GitHub API error: ${profileRes.statusText}`);
    }
    const profile = await profileRes.json();

    // Fetch Repositories
    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=100`, { headers });
    const repos = reposRes.ok ? await reposRes.json() : [];

    // Fetch Followers
    const followersRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/followers?per_page=30`, { headers });
    const followers = followersRes.ok ? await followersRes.json() : [];

    // Fetch Following
    const followingRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/following?per_page=30`, { headers });
    const following = followingRes.ok ? await followingRes.json() : [];

    return {
      username: profile.login,
      name: profile.name || profile.login,
      avatarUrl: profile.avatar_url,
      bio: profile.bio || "",
      publicRepos: profile.public_repos || 0,
      followersCount: profile.followers || 0,
      followingCount: profile.following || 0,
      htmlUrl: profile.html_url,
      followersList: Array.isArray(followers) ? followers.map(f => ({
        id: f.id,
        login: f.login,
        avatar_url: f.avatar_url,
        html_url: f.html_url
      })) : [],
      followingList: Array.isArray(following) ? following.map(f => ({
        id: f.id,
        login: f.login,
        avatar_url: f.avatar_url,
        html_url: f.html_url
      })) : [],
      repositories: Array.isArray(repos) ? repos.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || "No description provided.",
        language: r.language || "Other",
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        openIssues: r.open_issues_count || 0,
        updatedAt: r.updated_at,
        createdAt: r.created_at,
        htmlUrl: r.html_url,
        private: r.private || false
      })) : []
    };
  } catch (error) {
    console.error(`[GitHub Data Error]:`, error.message);
    throw error;
  }
};

module.exports = { fetchGitHubUserData };
