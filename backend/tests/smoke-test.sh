#!/bin/zsh
# Smoke test for the To-Do API (the same requests go in the Postman collection).
API=http://localhost:5001/api/v1/tasks
pass=0; fail=0

check() { # check <label> <expected-status> <actual-status>
  if [ "$2" = "$3" ]; then
    pass=$((pass+1)); echo "✓ $1 → $3"
  else
    fail=$((fail+1)); echo "✗ $1 → expected $2, got $3"
  fi
}

echo "--- 1. POST /tasks (valid) ---"
r=$(curl -s -w '\n%{http_code}' -X POST $API -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries","description":"Milk, eggs, bread","priority":"high","dueDate":"2026-10-25T18:30:00.000Z","category":"personal"}')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "create task" 201 $code
echo "$body" | jq -c '{success, id: .data.id, title: .data.title, status: .data.status, completed: .data.completed}'
ID1=$(echo "$body" | jq -r '.data.id')

echo "--- 2. POST /tasks (missing title) ---"
r=$(curl -s -w '\n%{http_code}' -X POST $API -H 'Content-Type: application/json' -d '{"description":"no title"}')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "reject empty title" 400 $code
echo "$body" | jq -c '{message, errors}'

echo "--- 3. POST /tasks (bad dueDate) ---"
r=$(curl -s -w '\n%{http_code}' -X POST $API -H 'Content-Type: application/json' -d '{"title":"Bad date","dueDate":"not-a-date"}')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "reject bad dueDate" 400 $code
echo "$body" | jq -c '{message, errors}'

echo "--- 4. seed more tasks ---"
ID2=$(curl -s -X POST $API -H 'Content-Type: application/json' -d '{"title":"Finish maths homework","priority":"medium","category":"school"}' | jq -r '.data.id')
ID3=$(curl -s -X POST $API -H 'Content-Type: application/json' -d '{"title":"Call grandma","priority":"low"}' | jq -r '.data.id')
echo "created: $ID1 $ID2 $ID3"

echo "--- 5. PATCH /tasks/:id/toggle (mark 1 complete) ---"
r=$(curl -s -w '\n%{http_code}' -X PATCH $API/$ID1/toggle)
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "toggle" 200 $code
echo "$body" | jq -c '{completed: .data.completed, status: .data.status}'

echo "--- 6. GET /tasks?search=grandma ---"
r=$(curl -s -w '\n%{http_code}' "$API?search=grandma")
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "search" 200 $code
echo "$body" | jq -c '{found: (.data.tasks | length), first: .data.tasks[0].title}'

echo "--- 7. GET /tasks?priority=medium&sort=title:asc ---"
r=$(curl -s -w '\n%{http_code}' "$API?priority=medium&sort=title:asc")
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "filter+sort" 200 $code
echo "$body" | jq -c '{count: (.data.tasks | length), pagination: .data.pagination}'

echo "--- 8. GET /tasks?limit=2&page=2 (pagination) ---"
r=$(curl -s -w '\n%{http_code}' "$API?limit=2&page=2")
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "pagination" 200 $code
echo "$body" | jq -c '{count: (.data.tasks | length), pagination: .data.pagination}'

echo "--- 9. GET /tasks/:id ---"
r=$(curl -s -w '\n%{http_code}' $API/$ID2)
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "get one" 200 $code
echo "$body" | jq -c '{id: .data.id, title: .data.title}'

echo "--- 10. GET /tasks/bad-id (invalid ObjectId) ---"
r=$(curl -s -w '\n%{http_code}' $API/not-an-id)
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "invalid id → 400" 400 $code
echo "$body" | jq -c '{message}'

echo "--- 11. GET /tasks/6521f0c7a9b3c4d5e6f7a8b9 (well-formed, missing) ---"
r=$(curl -s -w '\n%{http_code}' $API/6521f0c7a9b3c4d5e6f7a8b9)
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "missing id → 404" 404 $code
echo "$body" | jq -c '{message}'

echo "--- 12. PUT /tasks/:id (replace; status wins over completed) ---"
r=$(curl -s -w '\n%{http_code}' -X PUT $API/$ID2 -H 'Content-Type: application/json' \
  -d '{"title":"Finish maths homework (chapter 4)","description":"Exercises 1-10","completed":true,"status":"in-progress","priority":"high"}')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "replace" 200 $code
echo "$body" | jq -c '{title: .data.title, completed: .data.completed, status: .data.status, priority: .data.priority}'

echo "--- 13. PUT without title (replace requires full resource) ---"
r=$(curl -s -w '\n%{http_code}' -X PUT $API/$ID2 -H 'Content-Type: application/json' -d '{"priority":"low"}')
code=$(echo "$r" | tail -1)
check "PUT missing title → 400" 400 $code

echo "--- 14. PATCH /tasks/:id (partial: only completed) ---"
r=$(curl -s -w '\n%{http_code}' -X PATCH $API/$ID2 -H 'Content-Type: application/json' -d '{"completed":true}')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "patch completed" 200 $code
echo "$body" | jq -c '{completed: .data.completed, status: .data.status, priority: .data.priority}'

echo "--- 15. PATCH with unknown field only ---"
r=$(curl -s -w '\n%{http_code}' -X PATCH $API/$ID2 -H 'Content-Type: application/json' -d '{"hacker":"x"}')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "unknown field → 400" 400 $code
echo "$body" | jq -c '{message}'

echo "--- 16. NoSQL injection attempt in query ---"
r=$(curl -sg -w '\n%{http_code}' "$API?status[\$ne]=completed")
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "operator injection in query → 400" 400 $code
echo "$body" | jq -c '{message}'

echo "--- 17. Malformed JSON ---"
r=$(curl -s -w '\n%{http_code}' -X POST $API -H 'Content-Type: application/json' -d '{broken')
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "malformed JSON → 400" 400 $code
echo "$body" | jq -c '{message}'

echo "--- 18. DELETE /tasks/:id → 204 ---"
r=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/$ID3)
check "delete one → 204" 204 $r

echo "--- 19. DELETE same id again → 404 ---"
r=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $API/$ID3)
check "double delete → 404" 404 $r

echo "--- 20. DELETE /tasks/completed ---"
r=$(curl -s -w '\n%{http_code}' -X DELETE $API/completed)
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "clear completed" 200 $code
echo "$body" | jq -c '{message, data}'

echo "--- 21. GET /tasks/stats ---"
r=$(curl -s -w '\n%{http_code}' $API/stats)
code=$(echo "$r" | tail -1); body=$(echo "$r" | head -1)
check "stats" 200 $code
echo "$body" | jq -c '.data'

echo "--- 22. 405 wrong verb on /tasks ---"
r=$(curl -s -w '\n%{http_code}' -X DELETE $API)
code=$(echo "$r" | tail -1)
check "405 on collection DELETE" 405 $code

echo "--- 23. 404 unknown route ---"
r=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5001/api/v1/nope)
check "unknown route → 404" 404 $r

echo
echo "==============================="
echo "PASS: $pass   FAIL: $fail"
echo "==============================="
