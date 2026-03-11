cd backend
git status > ../git_debug.txt 2>&1
git log --oneline >> ../git_debug.txt 2>&1
git ls-files >> ../git_debug.txt 2>&1
