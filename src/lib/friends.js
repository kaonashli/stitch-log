// Database calls for friends and friend requests.
// Row Level Security makes sure you only ever see/change your own friendships.
import { supabase } from './supabase.js'

const PROFILE_FIELDS = 'id, username, display_name, avatar_path'

// In a LIKE/ILIKE search, % and _ are wildcards. Escape them so searching
// for "a_b" finds exactly "a_b".
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (ch) => '\\' + ch)
}

export async function searchProfiles(term, myId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .ilike('username', `%${escapeLike(term)}%`)
    .neq('id', myId)
    .order('username')
    .limit(10)
  if (error) throw error
  return data
}

// All of my friendships (pending and accepted) with both people's profiles attached.
export async function listMyFriendships() {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id, status, created_at, requester_id, addressee_id,
      requester:profiles!friendships_requester_id_fkey(${PROFILE_FIELDS}),
      addressee:profiles!friendships_addressee_id_fkey(${PROFILE_FIELDS})
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// My friendship row with one specific person, or null.
export async function getFriendshipWith(otherId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, status, requester_id, addressee_id')
    .or(`requester_id.eq.${otherId},addressee_id.eq.${otherId}`)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function sendFriendRequest(addresseeId) {
  const { error } = await supabase.from('friendships').insert({ addressee_id: addresseeId })
  if (error) {
    // 23505 = unique violation: a request between these two people already exists
    if (error.code === '23505') throw new Error('There is already a request between you two.')
    throw error
  }
}

export async function acceptFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', friendshipId)
  if (error) throw error
}

// Used for decline, cancel, and unfriend.
export async function removeFriendship(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

// Given a friendship row, return the profile of the person who isn't me.
export function otherPerson(friendship, myId) {
  return friendship.requester_id === myId ? friendship.addressee : friendship.requester
}
