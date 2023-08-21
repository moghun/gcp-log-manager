#!/bin/bash

API_URL="http://localhost:8080/api/postLog"
EVENT_NAMES=("click" "close" "open" "search" "login" "logout" "sign_up" "view" "add_to_cart" "remove_from_cart" "purchase" "refund" )
PAGES=("main" "profile" "search" "product" "cart" "checkout" "payment" "confirmation" "login" "signup" "logout")
COUNTRIES=("TR")
REGIONS=("Marmara")
CITIES=("Istanbul" "Balikesir" "Bursa" "Kocaeli" "Yalova")
USER_IDS=()

for _ in {1..1000}; do
  session_id=$(uuidgen)
  event_name=${EVENT_NAMES[$((RANDOM % ${#EVENT_NAMES[@]}))]}
  page=${PAGES[$((RANDOM % ${#PAGES[@]}))]}
  country=${COUNTRIES[$((RANDOM % ${#COUNTRIES[@]}))]}
  region=${REGIONS[$((RANDOM % ${#REGIONS[@]}))]}
  city=${CITIES[$((RANDOM % ${#CITIES[@]}))]}
  
  # Decide whether to use a new UUID or reuse an existing one
  if [ $((RANDOM % 2)) -eq 0 ] && [ ${#USER_IDS[@]} -gt 0 ]; then
    user_id=${USER_IDS[$((RANDOM % ${#USER_IDS[@]}))]}
    send_session_data=false
  else
    user_id=$(uuidgen)
    USER_IDS+=("$user_id")
    send_session_data=true
  fi
  
  event_time=$((RANDOM * 11 % (1641580800 - 1641993600) + 1641993600))  # Random time between 12/01/2021 - 14/01/2021
  session_start_time=$((event_time - (RANDOM % 600) - 1800))  # Session start within 30 minutes before event_time
  session_end_time=$((session_start_time + 600 + (RANDOM % 300)))  # Session duration: 10 minutes + random 5 minutes

  event_data=$(cat <<EOF
{
 "type": "event",
 "session_id": "$session_id",
 "event_name": "$event_name",
 "event_time": $event_time,
 "page": "$page",
 "country": "$country",
 "region": "$region",
 "city": "$city",
 "user_id": "$user_id"
}
EOF
)

  # Posting the "event" entry
  curl -X POST -H "Content-Type: application/json" -d "$event_data" $API_URL
  echo "Posted event data for user $user_id"

  # Posting the "session_start" and "session_end" entries if user is not duplicated
  if [ "$send_session_data" = true ]; then
    session_start_data=$(cat <<EOF
{
 "type": "session_start",
 "session_id": "$session_id",
 "event_name": "$event_name",
 "event_time": $event_time,
 "page": "$page",
 "country": "$country",
 "region": "$region",
 "city": "$city",
 "user_id": "$user_id"
}
EOF
)
    session_end_data=$(cat <<EOF
{
 "type": "session_end",
 "session_id": "$session_id",
 "event_name": "$event_name",
 "event_time": $event_time,
 "page": "$page",
 "country": "$country",
 "region": "$region",
 "city": "$city",
 "user_id": "$user_id"
}
EOF
)
    curl -X POST -H "Content-Type: application/json" -d "$session_start_data" $API_URL
    curl -X POST -H "Content-Type: application/json" -d "$session_end_data" $API_URL
    echo "Posted session data for user $user_id"
  fi
done
